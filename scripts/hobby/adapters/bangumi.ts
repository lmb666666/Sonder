import type { HobbyItem } from '../../../shared/types/hobby'
import type { HobbySyncResult } from '../utils'
import process from 'node:process'
import blogConfig from '../../../blog.config'
import { fetchJson, readEnvInt, readEnvList, sleep } from '../utils'

interface BangumiCollection {
	subject_id: number
	subject_type: number
	type: number
	rate: number
	ep_status: number
	updated_at: string
	comment?: string
	tags?: string[]
	subject?: {
		id?: number
		name?: string
		name_cn?: string
		date?: string
		images?: {
			large?: string
			common?: string
		}
	}
}

interface BangumiCollectionPage {
	total: number
	limit: number
	offset: number
	data?: BangumiCollection[]
}

// Bangumi 收藏状态码：1 想看、2 在看、3 看过、4 搁置、5 抛弃
const STATUS_LABELS: Record<number, string> = {
	1: '想看',
	2: '在看',
	3: '看过',
	4: '搁置',
	5: '抛弃',
}

/** 把 Bangumi 收藏条目归一化为兴趣条目 / Normalize a Bangumi collection entry */
export function normalizeBangumiCollection(entry: BangumiCollection): { item: HobbyItem, updatedAt: string } | undefined {
	const subject = entry.subject
	const subjectId = entry.subject_id || subject?.id
	if (!subjectId)
		return undefined

	const title = subject?.name_cn?.trim() || subject?.name?.trim()
	if (!title)
		return undefined

	const originalTitle = subject?.name?.trim()
	const cover = subject?.images?.large || subject?.images?.common || ''

	return {
		updatedAt: entry.updated_at || '',
		item: {
			title,
			...(originalTitle && originalTitle !== title ? { originalTitle } : {}),
			...(cover ? { cover: cover.replace(/^http:/, 'https:') } : {}),
			...(typeof entry.rate === 'number' && entry.rate > 0 ? { rating: entry.rate } : {}),
			...(subject?.date && subject.date.length >= 4 ? { year: subject.date.slice(0, 4) } : {}),
			status: STATUS_LABELS[entry.type] ?? '看过',
			...(entry.type === 2 && entry.ep_status > 0 ? { progress: `看到 EP${entry.ep_status}` } : {}),
			...(entry.comment?.trim() ? { note: entry.comment.trim() } : {}),
			...(Array.isArray(entry.tags) && entry.tags.length
				? { tags: entry.tags.filter(tag => typeof tag === 'string').slice(0, 6) }
				: {}),
			link: `https://bgm.tv/subject/${subjectId}`,
			source: 'bangumi',
			sourceId: String(subjectId),
		},
	}
}

async function fetchStatus(
	user: string,
	headers: Record<string, string>,
	status: number,
	limit: number,
): Promise<{ item: HobbyItem, updatedAt: string }[]> {
	const collected: { item: HobbyItem, updatedAt: string }[] = []
	let offset = 0
	let total = 0

	do {
		const query = new URLSearchParams({
			subject_type: '2',
			type: String(status),
			limit: '50',
			offset: String(offset),
		})
		const page = await fetchJson<BangumiCollectionPage>(
			`https://api.bgm.tv/v0/users/${encodeURIComponent(user)}/collections?${query}`,
			{ headers },
		)

		total = page.total || 0
		const data = page.data ?? []
		if (!data.length)
			break

		for (const entry of data) {
			const normalized = normalizeBangumiCollection(entry)
			if (normalized)
				collected.push(normalized)
		}

		offset += data.length
		if (collected.length >= limit || offset >= total)
			break
		await sleep(500)
	} while (offset < total)

	return collected
}

export async function collectBangumi(): Promise<HobbySyncResult> {
	const user = process.env.HOBBY_BANGUMI_USER?.trim()
	if (!user)
		throw new Error('未配置 HOBBY_BANGUMI_USER')

	const token = process.env.HOBBY_BANGUMI_TOKEN?.trim()
	const configuredStatuses = [...new Set(readEnvList('HOBBY_BANGUMI_STATUSES', [2, 3]).filter(status => status >= 1 && status <= 5))]
	const statuses = configuredStatuses.length ? configuredStatuses : [2, 3]
	const limit = readEnvInt('HOBBY_BANGUMI_LIMIT', 60)
	const headers: Record<string, string> = {
		'User-Agent': `Sonder-HobbySync/1.0 (+${blogConfig.url})`,
		'Accept': 'application/json',
		...(token ? { Authorization: `Bearer ${token}` } : {}),
	}

	const seen = new Set<string>()
	const collected: { item: HobbyItem, updatedAt: string }[] = []

	for (const status of statuses) {
		try {
			const entries = await fetchStatus(user, headers, status, limit)
			for (const entry of entries) {
				const key = entry.item.sourceId ?? entry.item.link ?? entry.item.title
				if (seen.has(key))
					continue
				seen.add(key)
				collected.push(entry)
			}
			await sleep(500)
		}
		catch (error) {
			throw new Error(`Bangumi 同步失败：${error instanceof Error ? error.message : String(error)}`)
		}
	}

	const items = collected
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
		.slice(0, limit)
		.map(entry => entry.item)

	return { key: 'anime', items }
}
