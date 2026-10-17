import type { HobbyGroup, HobbyItemMap } from '../shared/types/hobby'
import { describe, expect, it } from 'vitest'
import { formatHobbyRating, getHobbyItemKey, getHobbyItemKeys, getHobbySubline, mergeHobbyGroups } from '../shared/utils/hobby'

function group(overrides: Partial<HobbyGroup> = {}): HobbyGroup {
	return {
		key: 'game',
		name: '游戏',
		icon: 'tabler:device-gamepad-2',
		items: [],
		...overrides,
	}
}

describe('hobby item keys', () => {
	it('uses source id and link together for matching', () => {
		expect(getHobbyItemKeys({
			title: 'Elden Ring',
			source: 'steam',
			sourceId: '1245620',
			link: 'https://store.steampowered.com/app/1245620',
		})).toEqual([
			'steam:1245620',
			'https://store.steampowered.com/app/1245620',
		])
	})

	it('falls back to the title only when there is no id or link', () => {
		expect(getHobbyItemKeys({ title: '只有标题' })).toEqual(['只有标题'])
		expect(getHobbyItemKey({ title: '只有标题' })).toBe('只有标题')
	})
})

describe('hobby display helpers', () => {
	it('formats ratings and drops a trailing .0', () => {
		expect(formatHobbyRating(9)).toBe('9')
		expect(formatHobbyRating(9.4)).toBe('9.4')
		expect(formatHobbyRating(Number.NaN)).toBe('')
		expect(formatHobbyRating()).toBe('')
	})

	it('builds the creator and original-title subline', () => {
		expect(getHobbySubline({ title: '葬送的芙莉莲', creator: 'MADHOUSE', originalTitle: '葬送のフリーレン' })).toBe('MADHOUSE · 葬送のフリーレン')
		expect(getHobbySubline({ title: '只有标题' })).toBe('')
	})
})

describe('mergeHobbyGroups', () => {
	it('puts manual entries before synced entries', () => {
		const generated: HobbyItemMap = {
			game: [
				{ title: '同步条目', source: 'steam', sourceId: '2' },
			],
		}
		const [merged] = mergeHobbyGroups([group({ items: [{ title: '手动条目' }] })], generated)

		expect(merged.items.map(item => item.title)).toEqual(['手动条目', '同步条目'])
	})

	it('lets a manual entry win when the link or source id matches', () => {
		const generated: HobbyItemMap = {
			game: [
				{ title: '自动标题', link: 'https://store.steampowered.com/app/1', source: 'steam', sourceId: '1' },
				{ title: '保留条目', link: 'https://store.steampowered.com/app/2', source: 'steam', sourceId: '2' },
			],
		}
		const [merged] = mergeHobbyGroups([
			group({ items: [{ title: '手动标题', link: 'https://store.steampowered.com/app/1' }] }),
		], generated)

		expect(merged.items.map(item => item.title)).toEqual(['手动标题', '保留条目'])
	})

	it('filters hidden synced entries but keeps manual ones', () => {
		const generated: HobbyItemMap = {
			game: [
				{ title: '保留', source: 'steam', sourceId: '1' },
				{ title: '按 ID 隐藏', source: 'steam', sourceId: '2' },
				{ title: '按链接隐藏', link: 'https://example.com/hidden' },
			],
		}
		const [merged] = mergeHobbyGroups([
			group({
				hidden: ['steam:2', 'https://example.com/hidden'],
				items: [{ title: '手动条目' }],
			}),
		], generated)

		expect(merged.items.map(item => item.title)).toEqual(['手动条目', '保留'])
	})

	it('ignores generated groups without a matching manual group', () => {
		const [merged] = mergeHobbyGroups([group()], { unknown: [{ title: '忽略' }] })

		expect(merged.items).toEqual([])
	})

	it('drops unsafe links and covers', () => {
		const [merged] = mergeHobbyGroups([
			group({ items: [{ title: '不安全', link: 'javascript:alert(1)', cover: 'data:image/png;base64,x' }] }),
		])

		expect(merged.items[0]?.link).toBeUndefined()
		expect(merged.items[0]?.cover).toBeUndefined()
	})
})
