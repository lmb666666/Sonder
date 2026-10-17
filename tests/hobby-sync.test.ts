import { describe, expect, it } from 'vitest'
import { normalizeBangumiCollection } from '../scripts/hobby/adapters/bangumi'
import { normalizeSteamGame } from '../scripts/hobby/adapters/steam'

describe('normalizeBangumiCollection', () => {
	it('maps collection fields into a hobby item', () => {
		const result = normalizeBangumiCollection({
			subject_id: 400602,
			subject_type: 2,
			type: 2,
			rate: 9,
			ep_status: 12,
			updated_at: '2026-01-02T00:00:00+08:00',
			comment: '好看',
			tags: ['奇幻', '公路'],
			subject: {
				id: 400602,
				name: '葬送のフリーレン',
				name_cn: '葬送的芙莉莲',
				date: '2023-09-29',
				images: { large: 'http://lain.bgm.tv/pic/cover/l/x.jpg' },
			},
		})

		expect(result?.updatedAt).toBe('2026-01-02T00:00:00+08:00')
		expect(result?.item).toMatchObject({
			title: '葬送的芙莉莲',
			originalTitle: '葬送のフリーレン',
			cover: 'https://lain.bgm.tv/pic/cover/l/x.jpg',
			rating: 9,
			year: '2023',
			status: '在看',
			progress: '看到 EP12',
			note: '好看',
			tags: ['奇幻', '公路'],
			link: 'https://bgm.tv/subject/400602',
			source: 'bangumi',
			sourceId: '400602',
		})
	})

	it('maps watched entries without episode progress', () => {
		const result = normalizeBangumiCollection({
			subject_id: 1,
			subject_type: 2,
			type: 3,
			rate: 8,
			ep_status: 12,
			updated_at: '',
			subject: { id: 1, name: '进击的巨人', name_cn: '进击的巨人' },
		})

		expect(result?.item.status).toBe('看过')
		expect(result?.item.progress).toBeUndefined()
	})

	it('omits the original title when it matches the Chinese title', () => {
		const result = normalizeBangumiCollection({
			subject_id: 1,
			subject_type: 2,
			type: 2,
			rate: 0,
			ep_status: 0,
			updated_at: '',
			subject: { id: 1, name: '三体', name_cn: '三体' },
		})

		expect(result?.item.originalTitle).toBeUndefined()
		expect(result?.item.rating).toBeUndefined()
	})

	it('returns undefined without a subject id or title', () => {
		expect(normalizeBangumiCollection({
			subject_id: 0,
			subject_type: 2,
			type: 2,
			rate: 0,
			ep_status: 0,
			updated_at: '',
		})).toBeUndefined()

		expect(normalizeBangumiCollection({
			subject_id: 1,
			subject_type: 2,
			type: 2,
			rate: 0,
			ep_status: 0,
			updated_at: '',
			subject: { id: 1, name: ' ' },
		})).toBeUndefined()
	})
})

describe('normalizeSteamGame', () => {
	it('maps a played game with hours and last played year', () => {
		expect(normalizeSteamGame({
			appid: 1245620,
			name: 'ELDEN RING',
			playtime_forever: 10800,
			rtime_last_played: 1720000000,
		})).toEqual({
			title: 'ELDEN RING',
			cover: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/library_600x900_2x.jpg',
			year: '2024',
			status: '玩过',
			progress: '180 小时',
			link: 'https://store.steampowered.com/app/1245620',
			source: 'steam',
			sourceId: '1245620',
		})
	})

	it('formats short playtime in minutes and omits the year when unknown', () => {
		const result = normalizeSteamGame({
			appid: 1,
			name: 'A Short Game',
			playtime_forever: 30,
		})

		expect(result?.progress).toBe('30 分钟')
		expect(result?.year).toBeUndefined()
	})

	it('returns undefined for a game without a name', () => {
		expect(normalizeSteamGame({ appid: 1, name: ' ', playtime_forever: 60 })).toBeUndefined()
	})
})
