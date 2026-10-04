import type { ArticleRecord } from './utils'
import { Buffer } from 'node:buffer'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import blogConfig from '../../blog.config'
import redirectList from '../../redirects.json'
import { getArticlePath } from '../../shared/utils/article'
import { publishedArticles } from './content-validation'
import { getUnexpectedCollectionIds } from './sql-validation'
import { projectPath, readArticles, relativeProjectPath, reportResult } from './utils'

const failures: string[] = []
const warnings: string[] = []

async function exists(file: string): Promise<boolean> {
	try {
		await stat(file)
		return true
	}
	catch {
		return false
	}
}

async function findDist(): Promise<string | undefined> {
	for (const candidate of [projectPath('dist'), projectPath('.output', 'public')]) {
		if (await exists(candidate))
			return candidate
	}
}

async function readText(file: string): Promise<string> {
	return readFile(file, 'utf8')
}

async function allFiles(directory: string): Promise<string[]> {
	const files: string[] = []
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const file = path.join(directory, entry.name)
		if (entry.isDirectory())
			files.push(...await allFiles(file))
		else if (entry.isFile())
			files.push(file)
	}
	return files
}

function postReferences(text: string, permalinkPrefix: string): string[] {
	const references = new Set<string>()
	const escapedPrefix = permalinkPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const pattern = new RegExp(`/${escapedPrefix}/[A-Za-z0-9_-]+(?=["'<>\\s)\\]},?#]|$)`, 'g')
	for (const match of text.matchAll(pattern)) {
		if (match[0])
			references.add(match[0])
	}
	return [...references]
}

function isArticlePath(value: string, permalinkPrefix: string): boolean {
	const escapedPrefix = permalinkPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	return new RegExp(`^/${escapedPrefix}/[A-Za-z0-9_-]+$`).test(value)
}

function htmlText(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, ' ')
		.replace(/\s+/g, ' ')
}

function articleBodyProbe(source: string): string | undefined {
	const end = source.indexOf('\n---', 3)
	if (end < 0)
		return undefined
	const body = source.slice(end + 4)
	const lines = body.split('\n').map(line => line
		.replace(/^\s*(?:#+\s*|[-*+]\s+|\d+\.\s+)/, '')
		.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/[`*_>#]/g, '')
		.trim())
	return lines.find(line => line.length >= 24)
}

async function inspectSqlDump(dist: string, drafts: ArticleRecord[]): Promise<void> {
	const file = path.join(dist, '__nuxt_content', 'content', 'sql_dump.txt')
	if (!await exists(file))
		return
	try {
		const encoded = (await readText(file)).replace(/\s+/g, '')
		const sql = gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8')
		const ids = getUnexpectedCollectionIds(sql)
		if (ids.length)
			warnings.push(`sql_dump.txt 暴露非 content/posts/ collection id: ${ids.join(', ')}`)
		for (const article of drafts) {
			const probe = articleBodyProbe(await readFile(article.file, 'utf8'))
			if (probe && sql.includes(probe))
				failures.push(`${relativeProjectPath(article.file)}: draft 正文出现在生成输出 ${relativeProjectPath(file)}`)
		}
	}
	catch (error) {
		failures.push(`__nuxt_content/content/sql_dump.txt 无法解码 base64+gzip: ${error instanceof Error ? error.message : String(error)}`)
	}
}

const dist = await findDist()
if (!dist) {
	failures.push('dist 或 .output/public 不存在，请先运行 pnpm generate')
}
else {
	const requiredFiles = ['index.html', 'robots.txt', 'sitemap.xml', 'atom.xml', 'llms.txt']
	for (const file of requiredFiles) {
		if (!await exists(path.join(dist, file)))
			failures.push(`${relativeProjectPath(path.join(dist, file))} 缺失`)
	}

	let articles: ArticleRecord[]
	try {
		articles = await readArticles()
	}
	catch (error) {
		failures.push(`content/posts 无法读取: ${error instanceof Error ? error.message : String(error)}`)
		articles = []
	}
	const published = publishedArticles(articles)
	const drafts = articles.filter(article => article.frontmatter.draft === true)
	const expected = new Set(published.map(article => getArticlePath(article.postid!, blogConfig.article.permalinkPrefix)))
	const draftPaths = new Set(drafts.map(article => article.postid).filter((postid): postid is string => Boolean(postid)).map(postid => getArticlePath(postid, blogConfig.article.permalinkPrefix)))

	for (const article of published) {
		const articlePath = getArticlePath(article.postid!, blogConfig.article.permalinkPrefix)
		const output = path.join(dist, articlePath.slice(1), 'index.html')
		if (!await exists(output))
			failures.push(`${relativeProjectPath(article.file)}: 正式文章 path ${articlePath} 缺少静态输出 ${relativeProjectPath(output)}`)
	}
	for (const articlePath of draftPaths) {
		if (await exists(path.join(dist, articlePath.slice(1), 'index.html')))
			failures.push(`draft 文章不应出现在静态输出: ${articlePath}`)
	}

	const postDirectory = path.join(dist, blogConfig.article.permalinkPrefix)
	if (await exists(postDirectory)) {
		for (const file of await allFiles(postDirectory)) {
			const relative = `/${path.relative(dist, file).split(path.sep).join('/')}`
			if (!relative.endsWith('/index.html'))
				continue
			const articlePath = relative.slice(0, -'/index.html'.length)
			if (!expected.has(articlePath) && !(articlePath in redirectList))
				failures.push(`存在未预期的文章静态路径: ${articlePath}`)
		}
	}

	for (const name of ['sitemap.xml', 'atom.xml']) {
		const file = path.join(dist, name)
		if (!await exists(file))
			continue
		const references = postReferences(await readText(file), blogConfig.article.permalinkPrefix)
		for (const reference of references) {
			if (!isArticlePath(reference, blogConfig.article.permalinkPrefix))
				failures.push(`${name}: 非法文章路径 ${reference}`)
			else if (!expected.has(reference) && !(reference in redirectList))
				failures.push(`${name}: 引用了未发布或不存在的文章 ${reference}`)
		}
		for (const articlePath of expected) {
			if (!references.includes(articlePath))
				failures.push(`${name}: 缺少正式文章 ${articlePath}`)
		}
		for (const articlePath of draftPaths) {
			if (references.includes(articlePath))
				failures.push(`${name}: 不应包含 draft 文章 ${articlePath}`)
		}
	}

	const llmsFile = path.join(dist, 'llms.txt')
	if (await exists(llmsFile)) {
		const references = postReferences(await readText(llmsFile), blogConfig.article.permalinkPrefix)
		for (const reference of references) {
			if (!isArticlePath(reference, blogConfig.article.permalinkPrefix))
				failures.push(`llms.txt: 非法文章路径 ${reference}`)
			else if (!expected.has(reference) && !(reference in redirectList))
				failures.push(`llms.txt: 引用了未发布或不存在的文章 ${reference}`)
		}
		for (const articlePath of draftPaths) {
			if (references.includes(articlePath))
				failures.push(`llms.txt: 不应包含 draft 文章 ${articlePath}`)
		}
	}

	const files = await allFiles(dist)
	for (const file of files) {
		if (file.endsWith('sql_dump.txt') || !/\.(?:html|json|txt|xml)$/.test(file))
			continue
		const content = await readText(file)
		if (/(?:^|[\s"'(])content\/posts(?:[/"'.]|$)|(?:^|[\s"'(])content\\posts(?:[\\"'.]|$)|(?:^|[\s"'(])\/?content\/link\.md(?:[\s"')<]|$)/.test(content))
			failures.push(`${relativeProjectPath(file)}: 泄漏 content/posts 或 content/link.md 源路径`)
	}

	const previewFiles = files.filter(file => file.includes(`${path.sep}preview${path.sep}`) && /\.(?:html|json)$/.test(file))
	const previewText = (await Promise.all(previewFiles.map(async file => htmlText(await readText(file))))).join(' ')
	for (const article of published) {
		const source = await readFile(article.file, 'utf8')
		const probe = articleBodyProbe(source)
		if (probe && previewText.includes(probe))
			failures.push(`${relativeProjectPath(article.file)}: preview 页面包含正式文章正文片段`)
	}
	for (const article of drafts) {
		const probe = articleBodyProbe(await readFile(article.file, 'utf8'))
		if (!probe)
			continue
		for (const file of files) {
			if (file.endsWith('sql_dump.txt') || !/\.(?:html|json|txt|xml)$/.test(file))
				continue
			if (htmlText(await readText(file)).includes(probe))
				failures.push(`${relativeProjectPath(article.file)}: draft 正文出现在生成输出 ${relativeProjectPath(file)}`)
		}
	}

	const robotsFile = path.join(dist, 'robots.txt')
	if (await exists(robotsFile)) {
		const robots = await readText(robotsFile)
		const disallows = new Set([...robots.matchAll(/^Disallow:\s*(\S+)/gm)].map(match => match[1]))
		for (const rule of blogConfig.seo.robotsNotIndex) {
			if (!disallows.has(rule))
				failures.push(`robots.txt 缺少 preview 禁止规则: Disallow: ${rule}`)
		}
	}

	await inspectSqlDump(dist, drafts)
	console.log(`INFO dist: 检查 ${published.length} 篇正式文章，${drafts.length} 篇 draft`)
}

reportResult('dist', failures, warnings)
