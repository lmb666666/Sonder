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

export type AudioSourceDecision
	= | { mode: 'manual', src: string }
		| { mode: 'meting', songUrl: string }
		| { mode: 'none' }

export type AudioLyricsSource
	= | { mode: 'external', url: string }
		| { mode: 'empty' }

const METING_TIMEOUT = 4000
const AUDIO_LYRICS_TIMEOUT = 4000

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

function serviceUrl(template: string, source: MetingSongSource) {
	return template
		.replace(':server', encodeURIComponent(source.server))
		.replace(':type', 'song')
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
			const response = await fetchWithTimeout(serviceUrl(service, source), signal, timeoutMs)
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
