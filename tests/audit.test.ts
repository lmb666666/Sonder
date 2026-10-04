import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parse, stringify } from 'yaml'
import { decideAudioLyrics, decideAudioSource, parseMetingSongUrl } from '../app/composables/useMetingSong'
import { getEchoVideoEmbedUrl, getEchoVideoUrl, normalizeEchoExternalUrl, normalizeEchoFileUrl } from '../app/utils/ech0'
import { publishedArticles, validateContentArticles } from '../scripts/audit/content-validation'
import { getUnexpectedCollectionIds } from '../scripts/audit/sql-validation'
import { isHttpUrl, isSitePathOrHttpUrl, parseFrontmatter } from '../scripts/audit/utils'
import { getRecommendedArticles } from '../shared/utils/article'
import { getSafeImageUrl, getSafeNavigationUrl } from '../shared/utils/link'

const audioEmbedSource = readFileSync(new URL('../app/components/content/AudioEmbed.vue', import.meta.url), 'utf8')
const audioEmbedMobileStyles = audioEmbedSource.slice(audioEmbedSource.indexOf('@media (max-width: $breakpoint-phone)'))

const options = { categories: { tech: {} }, types: ['tech', 'story'] }

function article(file: string, overrides: Record<string, unknown> = {}) {
	return {
		file,
		frontmatter: {
			title: 'Title',
			date: '2025-01-02',
			description: 'Description',
			categories: ['tech'],
			tags: [],
			...overrides,
		},
	}
}

describe('url validation', () => {
	it.each(['https://example.com/path', 'http://localhost:3000'])('accepts HTTP URL %s', (value) => {
		expect(isHttpUrl(value)).toBe(true)
	})
	it.each(['ftp://example.com', '//example.com', 'not a URL', '', 42])('rejects invalid HTTP URL %s', (value) => {
		expect(isHttpUrl(value)).toBe(false)
	})
	it.each(['/posts/hello', 'https://example.com/post'])('accepts site path or URL %s', (value) => {
		expect(isSitePathOrHttpUrl(value)).toBe(true)
	})
	it.each(['//example.com', 'relative/path', ''])('rejects invalid site path or URL %s', (value) => {
		expect(isSitePathOrHttpUrl(value)).toBe(false)
	})
})

describe('safe navigation and image URLs', () => {
	const safeUrlGetters = [getSafeNavigationUrl, getSafeImageUrl]

	it.each(safeUrlGetters)('accepts HTTP and HTTPS URLs', (getSafeUrl) => {
		expect(getSafeUrl('http://example.com/path')).toBe('http://example.com/path')
		expect(getSafeUrl('https://example.com/path')).toBe('https://example.com/path')
	})

	it.each([
		'javascript:alert(1)',
		'data:text/html,hello',
		'vbscript:alert(1)',
		'//example.com/image.png',
		' https://example.com/image.png',
		'https://example.com/image.png ',
		'https://example.com/a\nb',
		'https://example.com/a\tb',
		'https://example.com/a\u007Fb',
		'https:\\\\example.com/image.png',
		'https://user@example.com/image.png',
		'https://user:password@example.com/image.png',
		'ftp://example.com/image.png',
	])('rejects unsafe navigation and image URLs: %s', (value) => {
		for (const getSafeUrl of safeUrlGetters)
			expect(getSafeUrl(value)).toBeUndefined()
	})
})

describe('unified audio source', () => {
	it.each([
		['[00:01.00]纯文本歌词', { mode: 'empty' }],
		['http://example.com/song.lrc', { mode: 'external', url: 'http://example.com/song.lrc' }],
		['https://example.com/song.lrc', { mode: 'external', url: 'https://example.com/song.lrc' }],
		['javascript:alert(1)', { mode: 'empty' }],
		['//example.com/song.lrc', { mode: 'empty' }],
	] as const)('classifies manual lyrics source %s', (value, expected) => {
		expect(decideAudioLyrics(value)).toEqual(expected)
	})

	it.each([
		['https://music.163.com/song?id=123456', { server: 'netease', id: '123456' }],
		['https://music.163.com/#/song?id=123456', { server: 'netease', id: '123456' }],
		['https://y.qq.com/n/ry唱片/songDetail/abc-123.html', { server: 'tencent', id: 'abc-123' }],
		['https://www.kugou.com/song/#hash=0123456789abcdef0123456789abcdef', { server: 'kugou', id: '0123456789abcdef0123456789abcdef' }],
	] as const)('parses supported platform URL %s', (url, expected) => {
		expect(parseMetingSongUrl(url)).toEqual(expected)
	})

	it.each([
		['https://example.com/song.mp3', 'https://music.163.com/song?id=1', { mode: 'manual', src: 'https://example.com/song.mp3' }],
		['', 'https://music.163.com/song?id=1', { mode: 'meting', songUrl: 'https://music.163.com/song?id=1' }],
		['', '', { mode: 'none' }],
	] as const)('chooses the expected source', (src, songUrl, expected) => {
		expect(decideAudioSource(src, songUrl)).toEqual(expected)
	})
})

describe('audio embed playback contract', () => {
	it('clears the active audio element when the source changes or component unmounts', () => {
		expect(audioEmbedSource).toMatch(/function clearAudioElement\(audio: HTMLAudioElement \| null\)/)
		expect(audioEmbedSource).toMatch(/audio\.pause\(\)[\s\S]*audio\.removeAttribute\('src'\)[\s\S]*audio\.load\(\)/)
		expect(audioEmbedSource).toMatch(/watch\(audioSrc, async \(\) => \{[\s\S]*clearAudioElement\(audioEl\.value\)/)
		expect(audioEmbedSource).toMatch(/onBeforeUnmount\(\(\) => \{[\s\S]*clearAudioElement\(audioEl\.value\)/)
	})

	it('syncs playback speed after source creation and metadata loading', () => {
		expect(audioEmbedSource).toMatch(/function syncPlaybackRate\(audio = audioEl\.value\)/)
		expect(audioEmbedSource).toMatch(/audio\.playbackRate = speed\.value/)
		expect(audioEmbedSource).toMatch(/onLoadedMetadata\(\)[\s\S]*syncPlaybackRate\(audio\)/)
		expect(audioEmbedSource).toMatch(/onMounted\(\(\) => syncPlaybackRate\(\)\)/)
	})

	it('keeps mobile touch controls at 44px without flex shrinking', () => {
		expect(audioEmbedMobileStyles).toMatch(/\.op-pill \{[\s\S]*flex-shrink: 0;[\s\S]*width: 2\.75rem;[\s\S]*height: 2\.75rem;/)
		expect(audioEmbedMobileStyles).toMatch(/\.op-icon \{[\s\S]*flex-shrink: 0;[\s\S]*width: 2\.75rem;[\s\S]*height: 2\.75rem;/)
		expect(audioEmbedMobileStyles).toMatch(/\.play-btn \{[\s\S]*flex-shrink: 0;[\s\S]*width: 2\.75rem;/)
		expect(audioEmbedMobileStyles).toMatch(/\.embed-controls \{[\s\S]*grid-area: ctrl;/)
	})
})

describe('recommended articles', () => {
	it('includes only articles with an explicit numeric recommendation', () => {
		const articles = [
			{ path: '/recommended', recommend: 1 },
			{ path: '/no-recommendation' },
			{ path: '/null-recommendation', recommend: null },
		]

		expect(getRecommendedArticles(articles)).toEqual([articles[0]])
	})
})

describe('ech0 URL normalization', () => {
	// 显式传入 apiUrl fixture，测试不依赖 blog.config 的具体值 / Pass an explicit apiUrl fixture so tests don't depend on blog.config values
	it('normalizes relative file URLs against the Ech0 HTTPS origin', () => {
		expect(normalizeEchoFileUrl('/uploads/image.png', 'https://example.com')).toBe('https://example.com/uploads/image.png')
		expect(normalizeEchoFileUrl('https://cdn.example.com/image.png', 'https://example.com')).toBe('https://cdn.example.com/image.png')
	})

	it.each([
		'javascript:alert(1)',
		'data:image/svg+xml,hello',
		'vbscript:alert(1)',
		'//evil.example/image.png',
		' /uploads/image.png',
		'/uploads/image.png ',
		'/uploads/a\nb.png',
		'/uploads\\evil.png',
		'https://user@cdn.example.com/image.png',
		'ftp://cdn.example.com/image.png',
	])('rejects unsafe file URLs: %s', (value) => {
		expect(normalizeEchoFileUrl(value, 'https://example.com')).toBe('')
	})

	it('normalizes safe external URLs and rejects dangerous schemes', () => {
		expect(normalizeEchoExternalUrl('example.com/path')).toBe('https://example.com/path')
		expect(normalizeEchoExternalUrl('http://example.com/path')).toBe('http://example.com/path')
		expect(normalizeEchoExternalUrl('https://example.com/path')).toBe('https://example.com/path')
	})

	it.each([
		'javascript:alert(1)',
		'data:text/html,hello',
		'vbscript:alert(1)',
		'//evil.example/path',
		'/relative/path',
		' https://example.com/path',
		'https://example.com/a\nb',
		'https://user:password@example.com/path',
		'ftp://example.com/path',
	])('rejects unsafe external URLs: %s', (value) => {
		expect(normalizeEchoExternalUrl(value)).toBe('')
	})

	it('generates video embeds only for fixed allowed hosts', () => {
		expect(getEchoVideoEmbedUrl({ url: 'https://youtu.be/dQw4w9WgXcQ' })).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
		expect(getEchoVideoEmbedUrl({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
		expect(getEchoVideoEmbedUrl({ url: 'https://www.bilibili.com/video/BV1xx411c7md' })).toBe('https://www.bilibili.com/blackboard/html5mobileplayer.html?bvid=BV1xx411c7md&as_wide=1&high_quality=1&danmaku=0')
	})

	it('accepts mixed-case Bilibili IDs with the exact BV ID shape', () => {
		expect(getEchoVideoUrl({ bvid: 'BV1Xx411C7mD' })).toBe('https://www.bilibili.com/video/BV1Xx411C7mD')
		expect(getEchoVideoEmbedUrl({ bvid: 'BV1Xx411C7mD' })).toContain('bvid=BV1Xx411C7mD')
		expect(getEchoVideoEmbedUrl({ url: 'https://www.bilibili.com/video/BV1Xx411C7mD' })).toContain('bvid=BV1Xx411C7mD')
	})

	it.each(['BV1xx411c7m', 'BV1xx411c7md-extra', 'BV1xx411c7m!', 'XX1xx411c7md'])('rejects invalid Bilibili IDs: %s', (bvid) => {
		expect(getEchoVideoUrl({ bvid })).toBe('')
		expect(getEchoVideoEmbedUrl({ bvid })).toBe('')
	})

	it.each([
		'https://evil.example/watch?v=dQw4w9WgXcQ',
		'https://www.youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
		'https://user@www.youtube.com/watch?v=dQw4w9WgXcQ',
		'javascript:alert(1)',
		'//www.youtube.com/watch?v=dQw4w9WgXcQ',
	])('rejects unsafe or unapproved video embed URLs: %s', (url) => {
		expect(getEchoVideoEmbedUrl({ url })).toBe('')
	})
})

describe('content audit', () => {
	it('reads only the YAML frontmatter and ignores permalink examples in the article body', () => {
		const frontmatter = parseFrontmatter([
			'---',
			'title: Example',
			'postid: abc-123',
			'---',
			'',
			'    permalink: \'posts/:abbrlink/\'',
		].join('\n'))
		expect(frontmatter).toEqual({ title: 'Example', postid: 'abc-123' })
	})

	it('accepts numeric YAML postids and reports them as normalized IDs', () => {
		const frontmatter = parseFrontmatter('---\ntitle: Example\npostid: 4632706\n---\n')
		const result = validateContentArticles([article('numeric.md', frontmatter)], options)

		expect(result.failures).toEqual([])
	})

	it('preserves leading zeroes when a numeric-shaped postid is serialized', () => {
		const serialized = stringify({ postid: '0123456' })
		const frontmatter = parse(serialized)

		expect(frontmatter.postid).toBe('0123456')
		expect(typeof frontmatter.postid).toBe('string')
	})

	it.each([-1, Number.MAX_SAFE_INTEGER + 1])('rejects invalid numeric YAML postids: %s', (postid) => {
		const result = validateContentArticles([article('invalid-numeric.md', { postid })], options)

		expect(result.failures).toEqual(expect.arrayContaining([expect.stringContaining('postid 非法')]))
	})

	it('accepts omitted category and tag fields using schema defaults', () => {
		const result = validateContentArticles([article('defaults.md', { postid: 'default-1', categories: undefined, tags: undefined })], options)

		expect(result.failures).toEqual([])
	})

	it('allows article and link collection IDs in SQL dumps', () => {
		const sql = [
			`INSERT INTO _content_content VALUES ('content/posts/example.md')`,
			`INSERT INTO _content_content VALUES ('content/link.md')`,
		].join('\n')

		expect(getUnexpectedCollectionIds(sql)).toEqual([])
	})

	it('reports non-article collection IDs from SQL dumps', () => {
		const sql = [
			`INSERT INTO _content_content VALUES ('content/metadata.json')`,
			`INSERT INTO _content_content VALUES ('content/new-id.json')`,
		].join('\n')

		expect(getUnexpectedCollectionIds(sql)).toEqual(['content/metadata.json', 'content/new-id.json'])
	})

	it('accepts valid frontmatter and reports invalid required fields and dates', () => {
		const valid = validateContentArticles([
			article('valid.md', { postid: 'abc-123' }),
			article('valid-second.md', { postid: 'abc_456' }),
		], options)
		expect(valid.failures).toEqual([])
		const invalid = validateContentArticles([article('invalid.md', { title: ' ', date: 'not-a-date' })], options)
		expect(invalid.failures).toEqual(expect.arrayContaining([
			expect.stringContaining('title 必须为非空字符串'),
			expect.stringContaining('date 无法解析'),
		]))
	})

	it('rejects malformed and duplicate postids', () => {
		const result = validateContentArticles([
			article('bad.md', { postid: 'with/slash' }),
			article('empty.md', { postid: '' }),
			article('unicode.md', { postid: '中文' }),
			article('first.md', { postid: 'repeated' }),
			article('second.md', { postid: 'repeated' }),
		], options)
		expect(result.failures).toEqual(expect.arrayContaining([
			expect.stringContaining('postid 非法'),
			expect.stringContaining('postid 重复 repeated'),
		]))
	})

	it('counts drafts but excludes them from published articles', () => {
		const articles = [
			{ ...article('published.md', { postid: 'live' }), postid: 'live' },
			{ ...article('draft.md', { postid: 'draft', draft: true }), postid: 'draft' },
		]
		expect(validateContentArticles(articles, options).drafts).toBe(1)
		expect(publishedArticles(articles).map(item => item.postid)).toEqual(['live'])
	})
})
