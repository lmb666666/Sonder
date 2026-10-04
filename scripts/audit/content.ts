import blogConfig from '../../blog.config'
import { articleTypes } from '../../shared/utils/article'
import { validateContentArticles } from './content-validation'
import { listArticleFiles, readFrontmatter, relativeProjectPath, reportResult } from './utils'

const failures: string[] = []
const articles: Array<{ file: string, frontmatter: Record<string, unknown> }> = []
try {
	for (const file of await listArticleFiles()) {
		try {
			articles.push({ file, frontmatter: await readFrontmatter(file) })
		}
		catch (error) {
			failures.push(`${relativeProjectPath(file)}: frontmatter 解析失败: ${error instanceof Error ? error.message : String(error)}`)
		}
	}
}
catch (error) {
	failures.push(`content/posts 扫描失败: ${error instanceof Error ? error.message : String(error)}`)
}

const result = validateContentArticles(
	articles.map(article => ({ file: relativeProjectPath(article.file), frontmatter: article.frontmatter })),
	{ categories: blogConfig.article.categories, types: [...articleTypes] },
)
failures.push(...result.failures)

console.log(`INFO content: 扫描 ${articles.length} 篇文章，draft ${result.drafts} 篇`)
reportResult('content', failures)
