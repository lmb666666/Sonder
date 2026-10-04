import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { parse as parseYaml } from 'yaml'

export interface FrontmatterRecord {
	[key: string]: unknown
}

export interface ArticleRecord {
	file: string
	frontmatter: FrontmatterRecord
	postid?: string
	draft: boolean
}

export function projectPath(...parts: string[]): string {
	return path.resolve(import.meta.dirname, '../..', ...parts)
}

export function parseFrontmatter(source: string): FrontmatterRecord {
	const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source)
	if (!match)
		throw new Error('缺少 YAML frontmatter 起始标记 ---')

	const value = parseYaml(match[1] ?? '')
	if (!value || typeof value !== 'object' || Array.isArray(value))
		throw new Error('frontmatter 必须解析为对象')
	return Object.fromEntries(Object.entries(value))
}

export async function readFrontmatter(file: string): Promise<FrontmatterRecord> {
	return parseFrontmatter(await readFile(file, 'utf8'))
}

export function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0
}

export function isPositiveInteger(value: unknown): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value > 0
}

export function isHttpUrl(value: unknown): value is string {
	if (typeof value !== 'string')
		return false
	try {
		const url = new URL(value)
		return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname)
	}
	catch {
		return false
	}
}

export function isSitePathOrHttpUrl(value: unknown): value is string {
	if (typeof value !== 'string' || !value.trim())
		return false
	if (value.startsWith('/'))
		return !value.startsWith('//')
	return isHttpUrl(value)
}

export function normalizedUrlPath(value: string): string {
	try {
		const url = new URL(value, 'https://audit.invalid')
		return url.pathname.replace(/\/$/, '') || '/'
	}
	catch {
		return value.replace(/\/$/, '') || '/'
	}
}

export async function listArticleFiles(): Promise<string[]> {
	const root = projectPath('content', 'posts')
	const files: string[] = []
	async function visit(directory: string): Promise<void> {
		for (const entry of await (await import('node:fs/promises')).readdir(directory, { withFileTypes: true })) {
			const file = path.join(directory, entry.name)
			if (entry.isDirectory())
				await visit(file)
			else if (entry.isFile() && entry.name.endsWith('.md'))
				files.push(file)
		}
	}
	await visit(root)
	return files.sort()
}

export async function readArticles(): Promise<ArticleRecord[]> {
	const articles: ArticleRecord[] = []
	for (const file of await listArticleFiles()) {
		const frontmatter = await readFrontmatter(file)
		articles.push({
			file,
			frontmatter,
			postid: typeof frontmatter.postid === 'string'
				? frontmatter.postid
				: typeof frontmatter.postid === 'number' && Number.isSafeInteger(frontmatter.postid)
					? String(frontmatter.postid)
					: undefined,
			draft: frontmatter.draft === true,
		})
	}
	return articles
}

export function relativeProjectPath(file: string): string {
	return path.relative(projectPath(), file).split(path.sep).join('/')
}

export function reportResult(name: string, failures: string[], warnings: string[] = []): never {
	for (const failure of failures) console.error(`FAIL ${name}: ${failure}`)
	for (const warning of warnings) console.warn(`WARN ${name}: ${warning}`)
	if (failures.length) {
		console.error(`FAIL ${name}: ${failures.length} 项问题`)
		process.exitCode = 1
	}
	else if (warnings.length) {
		console.log(`PASS WITH WARNINGS ${name}`)
	}
	else {
		console.log(`PASS ${name}`)
	}
	return undefined as never
}
