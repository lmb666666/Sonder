import { getSafeImageUrl, getSafeNavigationUrl } from '#shared/utils/link'
import blogConfig from '../../blog.config'

export type EchoExtensionType = 'MUSIC' | 'VIDEO' | 'GITHUBPROJ' | 'WEBSITE' | 'LOCATION' | 'TWEET' | (string & {})

export interface EchoItem {
	id: string
	content: string
	username: string
	fav_count: number
	created_at: number
	extension?: EchoExtension
	tags?: { name: string }[]
	echo_files?: EchoFile[]
}

export interface EchoExtension {
	type: EchoExtensionType
	payload?: Record<string, unknown> | null
}

export interface EchoFile {
	id?: string
	file_id?: string
	sort_order?: number
	file?: {
		id?: string
		url?: string
		name?: string
		content_type?: string
		width?: number
		height?: number
		category?: string
	}
	url?: string
	name?: string
	content_type?: string
	category?: string
}

export interface EchoExtensionMeta {
	icon: string
	label: string
	title: string
	description: string
	url: string
}

interface EchoQueryCache {
	cachedAt: number
	data: {
		total: number
		items: EchoItem[]
	}
}

export interface EchoQueryOptions {
	signal?: AbortSignal
	force?: boolean
	maxAge?: number
}

/** Default Ech0 instance for callers outside a Nuxt app config context. */
const DEFAULT_ECH0_API = blogConfig.features.moments.apiUrl
export const ECHO_CACHE_MAX_AGE = 10 * 60 * 1000
const ECHO_CACHE_PREFIX = 'ech0:query:'

export const ECHO_EXTENSION_ICON: Record<string, string> = {
	GITHUBPROJ: 'tabler:brand-github',
	LOCATION: 'tabler:map-pin',
	MUSIC: 'tabler:music',
	TWEET: 'tabler:brand-x',
	VIDEO: 'tabler:video',
	WEBSITE: 'tabler:world',
}

export const ECHO_EXTENSION_LABEL: Record<string, string> = {
	GITHUBPROJ: 'GitHub 项目',
	LOCATION: '位置',
	MUSIC: '音乐',
	TWEET: '推文',
	VIDEO: '视频',
	WEBSITE: '网站',
}

export function echoString(value: unknown) {
	return typeof value === 'string' ? value.trim() : ''
}

export function echoNumber(value: unknown) {
	if (typeof value === 'number' && Number.isFinite(value))
		return value
	if (typeof value === 'string' && value.trim()) {
		const parsed = Number(value)
		return Number.isFinite(parsed) ? parsed : undefined
	}
	return undefined
}

export function normalizeEchoFileUrl(url: string, apiUrl = DEFAULT_ECH0_API) {
	if (!url)
		return ''
	const candidate = url.startsWith('/') && !url.startsWith('//') ? `${apiUrl.replace(/\/$/, '')}${url}` : url
	return getSafeImageUrl(candidate) ?? ''
}

export function normalizeEchoExternalUrl(url: string) {
	if (!url || url.startsWith('/'))
		return ''
	const candidate = url.includes(':') ? url : `https://${url}`
	return getSafeNavigationUrl(candidate) ?? ''
}

export function getEchoFileUrl(file: EchoFile, apiUrl = DEFAULT_ECH0_API) {
	return normalizeEchoFileUrl(echoString(file.file?.url || file.url), apiUrl)
}

export function getEchoFileAlt(file: EchoFile, index: number) {
	return echoString(file.file?.name || file.name) || `动态图片 ${index + 1}`
}

export function isEchoImage(file: EchoFile, apiUrl = DEFAULT_ECH0_API) {
	const type = echoString(file.file?.content_type || file.content_type)
	const category = echoString(file.file?.category || file.category)
	const url = getEchoFileUrl(file, apiUrl)
	return category === 'image' || type.startsWith('image/') || /\.(?:avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i.test(url)
}

export function getEchoImages(item: EchoItem, apiUrl = DEFAULT_ECH0_API) {
	return (item.echo_files || [])
		.filter(file => isEchoImage(file, apiUrl) && getEchoFileUrl(file, apiUrl))
		.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

export function getEchoGithubRepoPath(repoUrl: string) {
	const normalized = repoUrl.startsWith('http') ? repoUrl : `https://${repoUrl}`
	try {
		const { pathname } = new URL(normalized)
		const [owner, repo] = pathname.split('/').filter(Boolean)
		return owner && repo ? `${owner}/${repo.replace(/\.git$/i, '')}` : ''
	}
	catch {
		return ''
	}
}

function getEchoGithubOwnerRepo(payload: Record<string, unknown>) {
	const owner = echoString(payload.owner)
	const repo = echoString(payload.repo)
	return owner && repo ? `${owner}/${repo}` : ''
}

export function echoPayload(payload: EchoExtension['payload']) {
	return payload || {}
}

export function getEchoVideoId(payload: EchoExtension['payload']) {
	const data = echoPayload(payload)
	return echoString(data.videoId || data.url || data.bvid || data.id)
}

function isBilibiliVideoId(value: string) {
	return /^BV[\da-z]{10}$/i.test(value)
}

export function getEchoVideoUrl(payload: EchoExtension['payload']) {
	const videoId = getEchoVideoId(payload)
	if (!videoId)
		return ''
	if (/^https?:\/\//i.test(videoId)) {
		const normalized = normalizeEchoExternalUrl(videoId)
		if (!normalized)
			return ''
		try {
			const { hostname } = new URL(normalized)
			return ['bilibili.com', 'www.bilibili.com', 'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(hostname) ? normalized : ''
		}
		catch {
			return ''
		}
	}
	if (isBilibiliVideoId(videoId))
		return `https://www.bilibili.com/video/${videoId}`
	if (/^BV/i.test(videoId))
		return ''
	if (/^[\w-]{11}$/.test(videoId))
		return `https://www.youtube.com/watch?v=${videoId}`
	return ''
}

function getEchoYoutubeId(url: URL) {
	if (url.hostname.includes('youtu.be'))
		return url.pathname.split('/').filter(Boolean)[0] || ''
	if (url.pathname.startsWith('/embed/') || url.pathname.startsWith('/shorts/'))
		return url.pathname.split('/').filter(Boolean)[1] || ''
	return url.searchParams.get('v') || ''
}

export function getEchoVideoEmbedUrl(payload: EchoExtension['payload']) {
	const videoId = getEchoVideoId(payload)
	if (!videoId)
		return ''
	if (videoId.startsWith('http')) {
		try {
			const url = new URL(videoId)
			if (!getSafeNavigationUrl(videoId))
				return ''
			if (!['www.bilibili.com', 'bilibili.com', 'youtu.be', 'www.youtube.com', 'youtube.com', 'm.youtube.com'].includes(url.hostname))
				return ''
			const bvid = url.pathname.split('/').find(isBilibiliVideoId)
			const youtubeId = getEchoYoutubeId(url)
			if (bvid && isBilibiliVideoId(bvid))
				return `https://www.bilibili.com/blackboard/html5mobileplayer.html?bvid=${bvid}&as_wide=1&high_quality=1&danmaku=0`
			if (/^[\w-]{11}$/.test(youtubeId))
				return `https://www.youtube.com/embed/${youtubeId}`
		}
		catch {
			return ''
		}
	}
	if (isBilibiliVideoId(videoId))
		return `https://www.bilibili.com/blackboard/html5mobileplayer.html?bvid=${videoId}&as_wide=1&high_quality=1&danmaku=0`
	if (/^BV/i.test(videoId))
		return ''
	if (/^[\w-]{11}$/.test(videoId))
		return `https://www.youtube.com/embed/${videoId}`
	return ''
}

export function getEchoLocationUrl(payload: EchoExtension['payload']) {
	const data = echoPayload(payload)
	const latitude = echoNumber(data.latitude)
	const longitude = echoNumber(data.longitude)
	if (typeof latitude === 'undefined' || typeof longitude === 'undefined')
		return ''
	const name = encodeURIComponent(echoString(data.placeholder) || `${latitude},${longitude}`)
	return `https://uri.amap.com/marker?position=${longitude},${latitude}&name=${name}&coordinate=wgs84&callnative=0`
}

export function getEchoLocationCoords(payload: EchoExtension['payload']) {
	const data = echoPayload(payload)
	const latitude = echoNumber(data.latitude)
	const longitude = echoNumber(data.longitude)
	if (typeof latitude === 'undefined' || typeof longitude === 'undefined')
		return ''
	return `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`
}

export function getEchoDomain(url: string) {
	try {
		return new URL(normalizeEchoExternalUrl(url)).hostname.replace(/^www\./, '')
	}
	catch {
		return ''
	}
}

export function getEchoExtensionUrl(ext: EchoExtension | undefined) {
	if (!ext?.payload)
		return ''
	const payload = echoPayload(ext.payload)
	if (ext.type === 'LOCATION')
		return getEchoLocationUrl(payload)
	if (ext.type === 'VIDEO')
		return getEchoVideoUrl(payload)
	if (ext.type === 'GITHUBPROJ') {
		const url = echoString(payload.url || payload.link || payload.href || payload.repoUrl)
		const ownerRepo = getEchoGithubOwnerRepo(payload)
		return normalizeEchoExternalUrl(url || (ownerRepo ? `github.com/${ownerRepo}` : ''))
	}
	return normalizeEchoExternalUrl(echoString(payload.url || payload.link || payload.href || payload.repoUrl || payload.site))
}

export function getEchoExtensionTitle(ext: EchoExtension | undefined) {
	if (!ext)
		return ''
	const payload = echoPayload(ext.payload)
	if (ext.type === 'MUSIC')
		return echoString(payload.title || payload.name) || '网易云音乐'
	if (ext.type === 'WEBSITE')
		return echoString(payload.title || payload.url || payload.site) || '网站'
	if (ext.type === 'GITHUBPROJ') {
		return echoString(payload.full_name) || getEchoGithubRepoPath(echoString(payload.repoUrl || payload.url || payload.href)) || getEchoGithubOwnerRepo(payload) || 'GitHub 项目'
	}
	if (ext.type === 'LOCATION')
		return echoString(payload.placeholder || payload.name || payload.address) || '查看位置'
	if (ext.type === 'VIDEO')
		return echoString(payload.title) || getEchoVideoId(payload) || '视频'
	if (ext.type === 'TWEET')
		return echoString(payload.title || payload.text || payload.url) || '推文'
	return ECHO_EXTENSION_LABEL[ext.type] || ext.type
}

export function getEchoExtensionDescription(ext: EchoExtension | undefined) {
	if (!ext)
		return ''
	const payload = echoPayload(ext.payload)
	const url = getEchoExtensionUrl(ext)
	if (ext.type === 'WEBSITE')
		return getEchoDomain(url) || url
	if (ext.type === 'GITHUBPROJ')
		return url
	if (ext.type === 'LOCATION')
		return getEchoLocationCoords(payload)
	if (ext.type === 'TWEET')
		return echoString(payload.username) ? `@${echoString(payload.username)}` : url
	if (ext.type === 'VIDEO')
		return getEchoVideoUrl(payload)
	return url
}

export function getEchoExtensionMeta(ext: EchoExtension | undefined): EchoExtensionMeta | undefined {
	if (!ext)
		return undefined
	return {
		icon: ECHO_EXTENSION_ICON[ext.type] || 'tabler:link',
		label: ECHO_EXTENSION_LABEL[ext.type] || ext.type,
		title: getEchoExtensionTitle(ext),
		description: getEchoExtensionDescription(ext),
		url: getEchoExtensionUrl(ext),
	}
}

function normalizeEchoResponse(value: unknown, apiUrl = DEFAULT_ECH0_API): { total: number, items: EchoItem[] } | undefined {
	if (!value || typeof value !== 'object')
		return undefined
	const data = value as Record<string, unknown>
	if (typeof data.total !== 'number' || !Number.isFinite(data.total) || !Array.isArray(data.items))
		return undefined
	const items = data.items.flatMap((value): EchoItem[] => {
		if (!value || typeof value !== 'object')
			return []
		const raw = value as Record<string, unknown>
		const extension = raw.extension && typeof raw.extension === 'object' ? raw.extension as Record<string, unknown> : undefined
		const rawPayload = extension?.payload && typeof extension.payload === 'object' ? extension.payload as Record<string, unknown> : undefined
		const payload = rawPayload ? { ...rawPayload } : undefined
		if (payload && extension?.type !== 'VIDEO') {
			for (const key of ['url', 'link', 'href', 'repoUrl', 'site']) {
				if (typeof payload[key] === 'string')
					payload[key] = normalizeEchoExternalUrl(payload[key] as string)
			}
		}
		const rawFiles = Array.isArray(raw.echo_files) ? raw.echo_files : []
		const echoFiles = rawFiles.flatMap((fileValue): EchoFile[] => {
			if (!fileValue || typeof fileValue !== 'object')
				return []
			const file = fileValue as Record<string, unknown>
			const nested = file.file && typeof file.file === 'object' ? file.file as Record<string, unknown> : undefined
			const rawUrl = echoString(nested?.url || file.url)
			const url = normalizeEchoFileUrl(rawUrl, apiUrl)
			return [{
				id: echoString(file.id) || undefined,
				file_id: echoString(file.file_id) || undefined,
				sort_order: echoNumber(file.sort_order),
				url: nested?.url === undefined ? url : undefined,
				file: nested
					? {
							id: echoString(nested.id) || undefined,
							url,
							name: echoString(nested.name) || undefined,
							content_type: echoString(nested.content_type) || undefined,
							width: echoNumber(nested.width),
							height: echoNumber(nested.height),
							category: echoString(nested.category) || undefined,
						}
					: undefined,
				name: echoString(file.name) || undefined,
				content_type: echoString(file.content_type) || undefined,
				category: echoString(file.category) || undefined,
			}]
		})
		const rawTags = Array.isArray(raw.tags) ? raw.tags : []
		return [{
			id: echoString(raw.id),
			content: echoString(raw.content),
			username: echoString(raw.username),
			fav_count: echoNumber(raw.fav_count) ?? 0,
			created_at: echoNumber(raw.created_at) ?? 0,
			tags: rawTags.flatMap((tag): { name: string }[] => {
				if (!tag || typeof tag !== 'object')
					return []
				const name = echoString((tag as Record<string, unknown>).name)
				return name ? [{ name }] : []
			}),
			echo_files: echoFiles,
			extension: extension && echoString(extension.type)
				? {
						type: echoString(extension.type),
						payload,
					}
				: undefined,
		}]
	})
	return { total: data.total, items }
}

/** 查询动态列表 */
export async function queryEchoes(page = 1, pageSize = 20, sortOrder = 'desc', optionsOrSignal?: AbortSignal | EchoQueryOptions, apiUrl = DEFAULT_ECH0_API): Promise<{ total: number, items: EchoItem[] }> {
	const options = normalizeEchoQueryOptions(optionsOrSignal)
	const cacheKey = getEchoCacheKey(page, pageSize, sortOrder, apiUrl)
	const maxAge = options.maxAge ?? ECHO_CACHE_MAX_AGE
	const cached = readEchoCache(cacheKey, apiUrl)

	if (!options.force && cached && Date.now() - cached.cachedAt < maxAge)
		return cached.data

	const res = await $fetch<{ code: number, data: { total: number, items: EchoItem[] } }>(`${apiUrl.replace(/\/$/, '')}/api/echo/query`, {
		method: 'POST',
		body: { page, pageSize, sortOrder },
		signal: options.signal,
	})
	if (res.code !== 1 || !res.data)
		throw new Error('Ech0 query failed')

	const data = normalizeEchoResponse(res.data, apiUrl)
	if (!data)
		throw new Error('Invalid Ech0 query response')
	writeEchoCache(cacheKey, data)
	return data
}

export function clearEchoCache() {
	if (!import.meta.client)
		return
	try {
		Object.keys(localStorage)
			.filter(key => key.startsWith(ECHO_CACHE_PREFIX))
			.forEach(key => localStorage.removeItem(key))
	}
	catch {
		// Storage may be unavailable; refresh should continue with a network request.
	}
}

function normalizeEchoQueryOptions(optionsOrSignal?: AbortSignal | EchoQueryOptions): EchoQueryOptions {
	if (!optionsOrSignal)
		return {}
	if ('aborted' in optionsOrSignal)
		return { signal: optionsOrSignal }
	return optionsOrSignal
}

function getEchoCacheKey(page: number, pageSize: number, sortOrder: string, apiUrl: string) {
	return `${ECHO_CACHE_PREFIX}${encodeURIComponent(apiUrl)}:${page}:${pageSize}:${sortOrder}`
}

function readEchoCache(key: string, apiUrl: string) {
	if (!import.meta.client)
		return undefined
	try {
		const raw = localStorage.getItem(key)
		if (!raw)
			return undefined
		const cached: unknown = JSON.parse(raw)
		if (!cached || typeof cached !== 'object')
			throw new TypeError('Invalid Ech0 cache')
		const entry = cached as Record<string, unknown>
		const data = normalizeEchoResponse(entry.data, apiUrl)
		if (typeof entry.cachedAt !== 'number' || !data)
			throw new TypeError('Invalid Ech0 cache')
		return { cachedAt: entry.cachedAt, data } as EchoQueryCache
	}
	catch {
		localStorage.removeItem(key)
		return undefined
	}
}

function writeEchoCache(key: string, data: EchoQueryCache['data']) {
	if (!import.meta.client)
		return
	try {
		localStorage.setItem(key, JSON.stringify({ cachedAt: Date.now(), data }))
	}
	catch {
		// Storage may be full or unavailable; dynamic rendering should still work.
	}
}
