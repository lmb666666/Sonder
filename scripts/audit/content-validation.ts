import type { FrontmatterRecord } from './utils'
import { postIdPattern } from '../../shared/utils/article'
import { isNonEmptyString } from './utils'

export interface ContentAuditArticle {
	file: string
	frontmatter: FrontmatterRecord
}

export interface ContentAuditOptions {
	categories: Record<string, unknown>
	types: string[]
}

export function validateContentArticles(articles: ContentAuditArticle[], options: ContentAuditOptions): { failures: string[], drafts: number } {
	const failures: string[] = []
	const postids = new Map<string, string>()
	let drafts = 0

	for (const { file, frontmatter } of articles) {
		for (const field of ['title', 'date', 'description']) {
			if (!isNonEmptyString(frontmatter[field]))
				failures.push(`${file}: ${field} 必须为非空字符串`)
		}
		for (const field of ['categories', 'tags']) {
			if (frontmatter[field] === undefined)
				continue
			if (!Array.isArray(frontmatter[field]))
				failures.push(`${file}: ${field} 必须为数组`)
			else if (!frontmatter[field].every(item => typeof item === 'string'))
				failures.push(`${file}: ${field} 必须只包含字符串`)
		}
		if (Array.isArray(frontmatter.categories)) {
			for (const category of frontmatter.categories) {
				if (typeof category === 'string' && !(category in options.categories))
					failures.push(`${file}: categories 包含未配置分类: ${category}`)
			}
		}
		if (typeof frontmatter.date === 'string' && Number.isNaN(Date.parse(frontmatter.date)))
			failures.push(`${file}: date 无法解析: ${frontmatter.date}`)
		if (frontmatter.type !== undefined && (typeof frontmatter.type !== 'string' || !options.types.includes(frontmatter.type)))
			failures.push(`${file}: type 非法: ${String(frontmatter.type)}，允许值: ${options.types.join(', ')}`)
		if (frontmatter.draft !== undefined && typeof frontmatter.draft !== 'boolean')
			failures.push(`${file}: draft 必须为 boolean`)
		if (frontmatter.draft === true)
			drafts++
		const postid = typeof frontmatter.postid === 'number' && Number.isSafeInteger(frontmatter.postid) && frontmatter.postid >= 0
			? String(frontmatter.postid)
			: frontmatter.postid
		if (typeof postid !== 'string' || !postIdPattern.test(postid))
			failures.push(`${file}: postid 非法: ${String(frontmatter.postid)}`)
		else if (postids.has(postid))
			failures.push(`${file}: postid 重复 ${postid}，已在 ${postids.get(postid)} 使用`)
		else postids.set(postid, file)
	}

	return { failures, drafts }
}

export function publishedArticles<T extends { frontmatter: FrontmatterRecord, postid?: string }>(articles: T[]): T[] {
	return articles.filter(article => article.frontmatter.draft !== true && Boolean(article.postid))
}
