#!/usr/bin/env node

import { exec } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { intro, log, outro, select, spinner, text } from '@clack/prompts'
import { Temporal } from 'temporal-polyfill'
import { stringify } from 'yaml'
import blogConfig from '../blog.config'
import { articleTypes, getArticlePath } from '../shared/utils/article'

function normalize(val: string | symbol | undefined): string | undefined {
	return typeof val === 'symbol' ? undefined : val?.trim()
}

// #region 读取参数
let fileName: string | undefined = process.argv[2]
const usePostid = blogConfig.generator.useRandomPostid
const defaultArticleType = articleTypes[0]
const now = Temporal.Now.plainDateTimeISO()
const dateStr = now.toLocaleString('sv')

const dir = join('content', 'posts', now.year.toString())

if (!fs.existsSync(dir))
	fs.mkdirSync(dir, { recursive: true })

intro(usePostid ? '📝 使用中文名 + 随机 URL 新建文章' : '📝 使用指定文件名 + 年份 URL 新建文章')
// #endregion

// #region 处理传入的文件名
if (fileName)
	log.info(`文件名: ${join(dir, fileName)}.md`)

const postid = usePostid ? randomBytes(4).toString('hex').slice(1) : undefined

// #region 获取文件名
do {
	if (fileName || usePostid)
		break

	fileName = normalize(await text({
		message: `请输入文件名（将创建在 ${dir} 下）`,
		placeholder: `monthly-${now.month}`,
		validate: val => val?.trim() === '' ? '文件名不能为空' : undefined,
	}))
	if (!fileName)
		process.exit(0)

	if (fs.existsSync(join(dir, `${fileName}.md`))) {
		log.error('文件已存在')
		fileName = undefined
	}
} while (!fileName)
// #endregion

// #region 获取文章标题
let title = fileName

do {
	if (title)
		break

	title = normalize(await text({
		message: '请输入博客标题',
		placeholder: `${now.month}月生活`,
		validate: val => val?.trim() === '' ? '标题不能为空' : undefined,
	}))
	if (!title)
		process.exit(0)

	if (usePostid) {
		if (fs.existsSync(join(dir, `${title}.md`))) {
			log.error('❌ 文件已存在')
			title = undefined
		}
	}
} while (!title)
// #endregion

// #region 生成文章文件路径
const mdPath = join(dir, `${usePostid ? title : fileName}.md`)
if (!process.argv[2])
	log.info(`文件名: ${mdPath}`)

if (fs.existsSync(mdPath)) {
	log.error('文件已存在')
	process.exit(1)
}

// #region 选择分类
const category = normalize(await select({
	message: '请选择分类',
	options: Object.keys(blogConfig.article.categories).map(c => ({ value: c })),
}))
if (!category)
	process.exit(0)
// #endregion

// #region 输入标签
const tagsInput = normalize(await text({
	message: '请输入标签（多个用中英文逗号或空格分隔）',
	placeholder: 'Vue, Vite, TypeScript',
}))
const tags = tagsInput?.split(/[\s,，]+/).map(t => t.trim()).filter(Boolean)
// #endregion

// #region 选择文章类型
const type = normalize(await select({
	message: '选择文章版式',
	options: [
		...articleTypes.map(value => ({ value, label: value })),
	],
	initialValue: defaultArticleType,
}))
if (!type)
	process.exit(0)
// #endregion

// #region 准备文章信息
const frontmatter = {
	title,
	description: `讲述关于${title}的故事，并根据${tags?.join('、') || '相关内容'}给出${category}。`,
	date: dateStr,
	updated: dateStr,
	image: '# 封面图推荐 2:1，不含与标题重复的文字',
	postid,
	type: type === defaultArticleType ? undefined : type,
	categories: category === blogConfig.defaultCategory ? undefined : [category],
	tags: tags?.length ? tags : undefined,
	// draft: 'true # 撰写完成后，请删除此行',
}
// #endregion

// #region 写入文章文件
fs.writeFileSync(mdPath, `---\n${stringify(Object.fromEntries(
	Object.entries(frontmatter).filter(([, value]) => value !== undefined),
)).trimEnd()}\n---

## 从${title}说起

\`\`\`md wrap
<!-- 你可以在此处书写大纲，并在上方完成文章 -->
\`\`\`
`, 'utf8')

log.success(`已创建: ${resolve(mdPath)}`)
if (postid)
	log.info(`🔗 文章链接: ${new URL(getArticlePath(postid, blogConfig.article.permalinkPrefix), blogConfig.url)}`)

// #region 打开编辑器
const s = spinner()
s.start('正在打开 VS Code...')
exec(`code "${mdPath}"`, (error) => {
	if (!error)
		return
	s.stop('⚠️ 无法打开 VS Code，请确认已通过命令面板注册 code 命令到 PATH')
	log.error(error.message)
	process.exit(1)
})
s.stop('⌨️ 已通过 VS Code 打开文件')
// #endregion

outro(`🎉 开始书写吧！`)
