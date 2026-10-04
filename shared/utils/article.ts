export const articleTypes = ['tech', 'story'] as const

export type ArticleType = typeof articleTypes[number]

export const articleOrder = {
	date: '创建日期',
	updated: '更新日期',
} as const

export type ArticleOrderType = keyof typeof articleOrder

export const postIdPattern = /^[\w-]+$/

export function getArticlePath(postid: string, permalinkPrefix: string): string {
	const prefix = permalinkPrefix.replace(/^\/+|\/+$/g, '')
	return `/${[prefix, postid].filter(Boolean).join('/')}`
}

export function getRecommendedArticles<T extends { recommend?: number | null }>(articles: readonly T[]): T[] {
	return articles.filter(article => typeof article.recommend === 'number')
}
