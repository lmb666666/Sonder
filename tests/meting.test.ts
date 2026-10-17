import { describe, expect, it } from 'vitest'
import {
	buildMetingServiceUrl,
	normalizeMetingPlaylist,
	normalizeMetingPlaylistTrack,
	parseMetingPlaylistUrl,
} from '../app/composables/useMetingSong'

describe('parseMetingPlaylistUrl', () => {
	it.each([
		['https://music.163.com/#/playlist?id=3778678', '3778678'],
		['https://music.163.com/playlist?id=3778678', '3778678'],
		['https://y.music.163.com/m/playlist?id=3778678&userid=1', '3778678'],
		['https://music.163.com/#/my/m/music/playlist?id=3778678', '3778678'],
	])('解析网易云歌单 %s', (url, id) => {
		expect(parseMetingPlaylistUrl(url)).toEqual({ server: 'netease', id })
	})

	it.each([
		['https://y.qq.com/n/ryqq/playlist/7527249826', '7527249826'],
		['https://y.qq.com/n/yqq/playlist/7527249826.html', '7527249826'],
		['https://i.y.qq.com/n2/m/share/details/taoge.html?id=7527249826', '7527249826'],
	])('解析 QQ 音乐歌单 %s', (url, id) => {
		expect(parseMetingPlaylistUrl(url)).toEqual({ server: 'tencent', id })
	})

	it.each([
		'https://music.163.com/song?id=287398',
		'https://y.qq.com/n/ryqq/songDetail/001abc',
		'https://example.com/playlist?id=1',
		'https://news.163.com/playlist?id=1',
		'https://sports.qq.com/playlist/7527249826',
		'https://music.163.com.evil.test/playlist?id=1',
	])('拒绝非歌单链接 %s', (url) => {
		expect(parseMetingPlaylistUrl(url)).toBeUndefined()
	})
})

describe('normalizeMetingPlaylist', () => {
	it('normalizes tracks and skips entries without a playable URL', () => {
		const tracks = normalizeMetingPlaylist([
			{
				name: '第一首',
				artist: ['歌手 A', '歌手 B'],
				url: 'https://api.test/?type=url&id=1',
				pic: 'https://img.test/1.jpg',
				lrc: 'https://api.test/?type=lrc&id=1',
			},
			{ name: '不可播放', artist: '歌手 C', url: 'javascript:alert(1)' },
			{
				title: '缓存字段',
				artist: '歌手 D',
				url: 'https://api.test/?type=url&id=3',
				cover: 'https://img.test/3.jpg',
				lrc: '[00:01.00]内联歌词',
			},
		])

		expect(tracks.map(track => track.title)).toEqual(['第一首', '缓存字段'])
		expect(tracks[0]?.artist).toBe('歌手 A / 歌手 B')
		expect(tracks[0]?.cover).toBe('https://img.test/1.jpg')
		expect(tracks[0]?.lrc).toBe('https://api.test/?type=lrc&id=1')
		expect(tracks[1]?.lrc).toBe('[00:01.00]内联歌词')
	})

	it('reuses cached normalized fields', () => {
		const track = normalizeMetingPlaylistTrack({
			title: '缓存歌曲',
			artist: '歌手',
			url: 'https://api.test/?type=url&id=9',
			cover: 'https://img.test/9.jpg',
		})

		expect(track).toEqual({
			title: '缓存歌曲',
			artist: '歌手',
			url: 'https://api.test/?type=url&id=9',
			cover: 'https://img.test/9.jpg',
		})
	})

	it('accepts a { data: [] } wrapper', () => {
		const tracks = normalizeMetingPlaylist({
			data: [{ name: '包装歌曲', artist: '歌手', url: 'https://api.test/?type=url&id=4' }],
		})

		expect(tracks).toHaveLength(1)
		expect(tracks[0]?.title).toBe('包装歌曲')
	})
})

describe('buildMetingServiceUrl', () => {
	it('replaces the type placeholder for playlists', () => {
		const url = buildMetingServiceUrl(
			'https://api.test/?server=:server&type=:type&id=:id&r=:r',
			{ server: 'netease', id: '3778678' },
			'playlist',
		)

		expect(url).toContain('server=netease')
		expect(url).toContain('type=playlist')
		expect(url).toContain('id=3778678')
	})
})
