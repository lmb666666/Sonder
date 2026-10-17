import { getSafeImageUrl, getSafeNavigationUrl } from '#shared/utils/link'

export interface MetingSong {
	url: string
	title: string
	artist: string
	cover: string
	lyrics: string
}

export interface MetingSongSource {
	server: 'netease' | 'tencent' | 'kugou'
	id: string
}

export interface MetingPlaylistSource {
	server: 'netease' | 'tencent'
	id: string
}

export interface MetingPlaylistTrack {
	title: string
	artist: string
	cover?: string
	url: string
	/** LRC 地址或内联歌词 / LRC URL or inline lyrics */
	lrc?: string
}

export interface MetingPlaylist {
	source: MetingPlaylistSource
	tracks: MetingPlaylistTrack[]
}

export type AudioSourceDecision
	= | { mode: 'manual', src: string }
		| { mode: 'meting', songUrl: string }
		| { mode: 'none' }

export type AudioLyricsSource
	= | { mode: 'external', url: string }
		| { mode: 'empty' }

const METING_TIMEOUT = 4000
const AUDIO_LYRICS_TIMEOUT = 4000
const METING_PLAYLIST_CACHE_MAX_AGE = 30 * 60 * 1000
const METING_PLAYLIST_CACHE_PREFIX = 'meting:playlist:'

/** Manual audio URLs win when both props are supplied, preserving article compatibility. */
export function decideAudioSource(src?: string, songUrl?: string): AudioSourceDecision {
	if (typeof src === 'string' && src.trim())
		return { mode: 'manual', src }
	if (typeof songUrl === 'string' && songUrl.trim())
		return { mode: 'meting', songUrl }
	return { mode: 'none' }
}

/** Manual lyrics accept only safe HTTP(S) URLs; all other values are empty lyrics. */
export function decideAudioLyrics(value?: string): AudioLyricsSource {
	if (typeof value !== 'string' || !value.trim())
		return { mode: 'empty' }

	const url = getSafeNavigationUrl(value)
	return url ? { mode: 'external', url } : { mode: 'empty' }
}

export function parseMetingSongUrl(value: string): MetingSongSource | undefined {
	try {
		const url = new URL(value)
		const host = url.hostname.toLowerCase().replace(/^www\./, '')
		const hash = url.hash.replace(/^#/, '')
		const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : hash.replace(/^\//, '')
		const hashParams = new URLSearchParams(hashQuery)
		let server: MetingSongSource['server'] | undefined
		let id = url.searchParams.get('id') || url.searchParams.get('hash') || hashParams.get('id') || hashParams.get('hash') || ''

		if (host === 'music.163.com' || host === '163.com') {
			server = 'netease'
			id ||= url.pathname.match(/\/song\/(\d+)/)?.[1] || ''
		}
		else if (host === 'y.qq.com' || host === 'qq.com') {
			server = 'tencent'
			id ||= url.searchParams.get('songmid') || url.pathname.match(/\/(?:songDetail|song)\/([\w-]+)/)?.[1] || url.pathname.match(/\/([\w-]+)\.html$/)?.[1] || ''
		}
		else if (host === 'kugou.com') {
			server = 'kugou'
			id ||= url.searchParams.get('hash') || url.pathname.match(/\/([\da-f]{32})/i)?.[1] || ''
		}

		return server && /^[\w-]+$/.test(id) ? { server, id } : undefined
	}
	catch {
		return undefined
	}
}

export function parseMetingPlaylistUrl(value: string): MetingPlaylistSource | undefined {
	try {
		const url = new URL(value)
		const host = url.hostname.toLowerCase().replace(/^www\./, '')
		const hash = url.hash.replace(/^#/, '')
		const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : ''
		const hashParams = new URLSearchParams(hashQuery)
		const route = `${url.pathname}${url.search}${hash ? `#${hash}` : ''}`
		const idFromQuery = url.searchParams.get('id') || hashParams.get('id') || url.searchParams.get('dissid') || hashParams.get('dissid') || ''

		const isNeteaseHost = host === 'music.163.com' || host.endsWith('.music.163.com')
		const isTencentHost = host === 'y.qq.com' || host.endsWith('.y.qq.com')

		if (isNeteaseHost) {
			if (!/playlist/i.test(route))
				return undefined
			const id = idFromQuery || route.match(/\/playlist\/(\d+)/)?.[1] || ''
			return /^\d+$/.test(id) ? { server: 'netease', id } : undefined
		}

		if (isTencentHost) {
			if (!/playlist|taoge/i.test(route))
				return undefined
			const id = idFromQuery || route.match(/\/playlist\/(\d+)/)?.[1] || ''
			return /^\d+$/.test(id) ? { server: 'tencent', id } : undefined
		}

		return undefined
	}
	catch {
		return undefined
	}
}

function mediaUrl(value: unknown, image = false) {
	if (typeof value !== 'string' || !value.trim())
		return ''
	try {
		const parsed = new URL(value.trim())
		if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || !parsed.hostname)
			return ''
		return image ? getSafeImageUrl(parsed.href) ?? '' : parsed.href
	}
	catch {
		return ''
	}
}

/** 生成 Meting 端点请求地址 / Build a Meting endpoint URL */
export function buildMetingServiceUrl(template: string, source: { server: string, id: string }, type: 'song' | 'playlist' = 'song') {
	return template
		.replace(':server', encodeURIComponent(source.server))
		.replace(':type', type)
		.replace(':id', encodeURIComponent(source.id))
		.replace(':r', String(Date.now()))
}

async function fetchWithTimeout(input: string, signal: AbortSignal, timeoutMs: number) {
	const controller = new AbortController()
	const onAbort = () => controller.abort()
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
	signal.addEventListener('abort', onAbort, { once: true })
	if (signal.aborted)
		controller.abort()
	try {
		return await fetch(input, { signal: controller.signal })
	}
	catch (error) {
		if (!signal.aborted && controller.signal.aborted)
			throw new Error('Meting request timed out')
		throw error
	}
	finally {
		clearTimeout(timeoutId)
		signal.removeEventListener('abort', onAbort)
	}
}

export async function resolveAudioLyrics(value: string, options: { signal?: AbortSignal, timeoutMs?: number } = {}): Promise<string> {
	const source = decideAudioLyrics(value)
	if (source.mode !== 'external')
		return ''

	const signal = options.signal ?? new AbortController().signal
	const timeoutMs = options.timeoutMs ?? AUDIO_LYRICS_TIMEOUT
	const controller = new AbortController()
	const onAbort = () => controller.abort()
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
	signal.addEventListener('abort', onAbort, { once: true })
	if (signal.aborted)
		controller.abort()
	try {
		const response = await fetch(source.url, { signal: controller.signal })
		if (!response.ok)
			return ''
		if (response.url && !getSafeNavigationUrl(response.url))
			return ''
		const text = await response.text()
		return text.trim() ? text : ''
	}
	catch {
		return ''
	}
	finally {
		clearTimeout(timeoutId)
		signal.removeEventListener('abort', onAbort)
	}
}

/** 归一化歌单中的单曲；同时兼容 Meting 原始字段与缓存后的字段 */
export function normalizeMetingPlaylistTrack(value: unknown): MetingPlaylistTrack | undefined {
	if (!value || typeof value !== 'object')
		return undefined

	const data = value as Record<string, unknown>
	const url = mediaUrl(data.url)
	if (!url)
		return undefined

	const rawTitle = typeof data.name === 'string' ? data.name : data.title
	const title = typeof rawTitle === 'string' && rawTitle.trim() ? rawTitle.trim() : '未命名歌曲'

	let artist = ''
	if (typeof data.artist === 'string')
		artist = data.artist.trim()
	else if (Array.isArray(data.artist))
		artist = data.artist.filter(item => typeof item === 'string' && item.trim()).map(item => (item as string).trim()).join(' / ')

	const cover = mediaUrl(data.pic ?? data.cover, true)
	const rawLrc = typeof data.lrc === 'string' ? data.lrc.trim() : ''
	// Meting 的 lrc 通常是地址，部分实现直接返回内联歌词
	const lrc = rawLrc ? (rawLrc.includes('[') ? rawLrc : mediaUrl(rawLrc) || undefined) : undefined

	return {
		title,
		artist,
		...(cover ? { cover } : {}),
		url,
		...(lrc ? { lrc } : {}),
	}
}

/** 归一化歌单响应；兼容数组与 { data: [] } 两种包装 */
export function normalizeMetingPlaylist(body: unknown): MetingPlaylistTrack[] {
	let list: unknown[] = []
	if (Array.isArray(body))
		list = body
	else if (body && typeof body === 'object' && Array.isArray((body as Record<string, unknown>).data))
		list = (body as Record<string, unknown>).data as unknown[]

	return list.flatMap((item) => {
		const track = normalizeMetingPlaylistTrack(item)
		return track ? [track] : []
	})
}

interface MetingPlaylistCacheEntry {
	cachedAt: number
	tracks: MetingPlaylistTrack[]
}

function playlistCacheKey(source: MetingPlaylistSource) {
	return `${METING_PLAYLIST_CACHE_PREFIX}${source.server}:${source.id}`
}

function readMetingPlaylistCache(source: MetingPlaylistSource): MetingPlaylistCacheEntry | undefined {
	if (!import.meta.client)
		return undefined
	try {
		const raw = localStorage.getItem(playlistCacheKey(source))
		if (!raw)
			return undefined
		const entry = JSON.parse(raw) as Partial<MetingPlaylistCacheEntry>
		if (typeof entry.cachedAt !== 'number' || !Array.isArray(entry.tracks))
			return undefined
		const tracks = entry.tracks.flatMap((track) => {
			const normalized = normalizeMetingPlaylistTrack(track)
			return normalized ? [normalized] : []
		})
		return tracks.length ? { cachedAt: entry.cachedAt, tracks } : undefined
	}
	catch {
		return undefined
	}
}

function writeMetingPlaylistCache(source: MetingPlaylistSource, tracks: MetingPlaylistTrack[]) {
	if (!import.meta.client)
		return
	try {
		localStorage.setItem(playlistCacheKey(source), JSON.stringify({ cachedAt: Date.now(), tracks } satisfies MetingPlaylistCacheEntry))
	}
	catch {
		// 存储不可用时静默降级为不缓存
	}
}

/**
 * 通过 Meting `type=playlist` 解析歌单。结果按 `meting:playlist:<server>:<id>` 缓存 30 分钟；
 * 刷新时传 `force`，请求失败时回退旧缓存。
 */
export async function resolveMetingPlaylist(
	playlistUrl: string,
	options: { signal?: AbortSignal, timeoutMs?: number, metingApis?: string[], force?: boolean } = {},
): Promise<MetingPlaylist | undefined> {
	const sourceUrl = getSafeNavigationUrl(playlistUrl) ?? ''
	const source = parseMetingPlaylistUrl(sourceUrl)
	if (!source)
		return undefined

	const cached = readMetingPlaylistCache(source)
	if (cached && !options.force && Date.now() - cached.cachedAt < METING_PLAYLIST_CACHE_MAX_AGE)
		return { source, tracks: cached.tracks }

	const signal = options.signal ?? new AbortController().signal
	const timeoutMs = options.timeoutMs ?? METING_TIMEOUT
	for (const service of options.metingApis ?? []) {
		try {
			const response = await fetchWithTimeout(buildMetingServiceUrl(service, source, 'playlist'), signal, timeoutMs)
			if (!response.ok)
				continue
			const body: unknown = await response.json()
			const tracks = normalizeMetingPlaylist(body)
			if (!tracks.length)
				continue
			writeMetingPlaylistCache(source, tracks)
			return { source, tracks }
		}
		catch (error) {
			if ((error as DOMException)?.name === 'AbortError')
				return undefined
		}
	}

	return cached ? { source, tracks: cached.tracks } : undefined
}

/** Meting API 端点模板来自 blog.config.ts 的 features.music.metingApis，按顺序降级尝试 */
export async function resolveMetingSong(songUrl: string, options: { signal?: AbortSignal, timeoutMs?: number, metingApis?: string[] } = {}): Promise<MetingSong | undefined> {
	const sourceUrl = getSafeNavigationUrl(songUrl) ?? ''
	const source = parseMetingSongUrl(sourceUrl)
	if (!source)
		return undefined

	const signal = options.signal ?? new AbortController().signal
	const timeoutMs = options.timeoutMs ?? METING_TIMEOUT
	for (const service of options.metingApis ?? []) {
		try {
			const response = await fetchWithTimeout(buildMetingServiceUrl(service, source, 'song'), signal, timeoutMs)
			if (!response.ok)
				continue
			const body: unknown = await response.json()
			const song = Array.isArray(body) ? body[0] : body
			if (!song || typeof song !== 'object')
				continue
			const data = song as Record<string, unknown>
			const url = mediaUrl(data.url)
			if (!url)
				continue

			let lyrics = ''
			const lyricsUrl = mediaUrl(data.lrc)
			if (lyricsUrl) {
				try {
					const lyricsResponse = await fetchWithTimeout(lyricsUrl, signal, timeoutMs)
					if (lyricsResponse.ok) {
						const text = await lyricsResponse.text()
						lyrics = text.trim() ? text : ''
					}
				}
				catch (error) {
					if ((error as DOMException)?.name === 'AbortError')
						return undefined
				}
			}

			return {
				url,
				title: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : '未命名歌曲',
				artist: typeof data.artist === 'string' ? data.artist.trim() : '',
				cover: mediaUrl(data.pic, true),
				lyrics,
			}
		}
		catch (error) {
			if ((error as DOMException)?.name === 'AbortError')
				return undefined
		}
	}
	return undefined
}
