import type { HobbyGroup, HobbyItem, HobbyItemMap } from '../types/hobby'
import { getSafeImageUrl, getSafeNavigationUrl } from './link'

/** 自动同步与手动数据共用的去重键 / Dedupe key shared by synced and manual entries */
export function getHobbyItemKey(item: HobbyItem) {
	if (item.source && item.sourceId)
		return `${item.source}:${item.sourceId}`
	return item.link || item.title
}

/** 一个条目可能同时拥有平台 ID 与链接，去重时要任一命中 / Any matching key means the same entry */
export function getHobbyItemKeys(item: HobbyItem) {
	const keys: string[] = []
	if (item.source && item.sourceId)
		keys.push(`${item.source}:${item.sourceId}`)
	if (item.link)
		keys.push(item.link)
	if (!keys.length)
		keys.push(item.title)
	return keys
}

/** 评分统一去掉无意义的 `.0`，非法值返回空串 / Format a 0–10 rating, dropping a trailing `.0` */
export function formatHobbyRating(value?: number) {
	if (typeof value !== 'number' || !Number.isFinite(value))
		return ''
	return value.toFixed(1).replace(/\.0$/, '')
}

/** 卡片和阅读列表共用的副标题：作者 / 导演 + 原名 / Shared creator and original-title line */
export function getHobbySubline(item: HobbyItem) {
	return [item.creator, item.originalTitle].filter(Boolean).join(' · ')
}

function isHidden(item: HobbyItem, hidden: Set<string>) {
	if (!hidden.size)
		return false
	if (item.source && item.sourceId && hidden.has(`${item.source}:${item.sourceId}`))
		return true
	if (item.sourceId && hidden.has(item.sourceId))
		return true
	if (item.link && hidden.has(item.link))
		return true
	return hidden.has(item.title)
}

function sanitizeItem(item: HobbyItem): HobbyItem {
	return {
		...item,
		cover: getSafeImageUrl(item.cover),
		link: getSafeNavigationUrl(item.link),
	}
}

/**
 * 手写条目在前、自动条目在后；手写条目按去重键覆盖自动条目。
 * Manual entries come first and win over synced duplicates.
 */
export function mergeHobbyGroups(groups: HobbyGroup[], generated: HobbyItemMap = {}): HobbyGroup[] {
	return groups.map((group) => {
		const hidden = new Set(group.hidden ?? [])
		const manualItems = group.items.map(sanitizeItem)
		const manualKeys = new Set(manualItems.flatMap(getHobbyItemKeys))
		const syncedItems = (generated[group.key] ?? [])
			.filter(item => !isHidden(item, hidden))
			.map(sanitizeItem)
			.filter(item => !getHobbyItemKeys(item).some(key => manualKeys.has(key)))

		return { ...group, items: [...manualItems, ...syncedItems] }
	})
}
