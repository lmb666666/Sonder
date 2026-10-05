import { readFile } from 'node:fs/promises'
import blogConfig from '../../blog.config'
import { isHttpUrl, isNonEmptyString, isPositiveInteger, isSitePathOrHttpUrl, normalizedUrlPath, projectPath, reportResult } from './utils'

const failures: string[] = []

const config = blogConfig as typeof blogConfig & {
	title?: unknown
	language?: unknown
	timeZone?: unknown
	url?: unknown
	defaultCategory?: unknown
	author?: { name?: unknown }
	article?: { categories?: unknown, permalinkPrefix?: unknown }
	seo?: { robotsNotIndex?: unknown, antiMirrorBlacklist?: unknown }
	feed?: { enabled?: unknown, limit?: unknown, enableStyle?: unknown }
	features?: {
		share?: { enabled?: unknown }
		moments?: { title?: unknown, description?: unknown, pageSize?: unknown, showPoweredBy?: unknown }
		circle?: { title?: unknown, description?: unknown, pageSize?: unknown, showPoweredBy?: unknown }
		music?: { metingApis?: unknown, soundfontsUrl?: unknown }
	}
	home?: {
		mode?: unknown
		sections?: Record<string, unknown>
		hero?: { watermark?: unknown, greeting?: unknown, button?: { enabled?: unknown } }
		sectionTitles?: Record<string, unknown>
		location?: { text?: unknown }
		mbti?: { linkText?: unknown }
	}
	pages?: {
		home?: { enabled?: unknown }
		blog?: { title?: unknown }
		link?: { enabled?: unknown, remindNoFeed?: unknown, randomInGroup?: unknown, title?: unknown, description?: unknown, tabs?: Record<string, unknown> }
		archive?: { enabled?: unknown, title?: unknown }
	}
	theme?: { default?: unknown }
	generator?: { useRandomPostid?: unknown }
	pagination?: { perPage?: unknown }
	ui?: {
		article?: { info?: Record<string, unknown>, copyright?: { enabled?: unknown, title?: unknown }, surround?: Record<string, unknown> }
		sidebar?: { themeToggle?: unknown, blogInfo?: { enabled?: unknown, title?: unknown, uptime?: unknown, lastUpdated?: unknown, buildPlatform?: unknown, imageBed?: { enabled?: unknown, name?: unknown } } }
		slide?: { enabled?: unknown, tag?: unknown, autoplayDelay?: unknown, aside?: { enabled?: unknown, random?: unknown, rss?: unknown } }
		externalStyles?: unknown
		preconnects?: unknown
	}
	footer?: { copyright?: unknown }
}
const requiredStrings: Array<[string, unknown]> = [
	['title', config.title],
	['language', config.language],
	['timeZone', config.timeZone],
	['author.name', config.author?.name],
]
for (const [name, value] of requiredStrings) {
	if (!isNonEmptyString(value))
		failures.push(`blog.config.${name} 必须为非空字符串`)
}
if (!isHttpUrl(config.url))
	failures.push(`blog.config.url 非法: ${String(config.url)}`)
const categories = config.article?.categories
if (!isNonEmptyString(config.defaultCategory) || !categories || typeof categories !== 'object' || !(config.defaultCategory in categories))
	failures.push(`blog.config.defaultCategory 不存在于 article.categories: ${String(config.defaultCategory)}`)
if (!isNonEmptyString(config.article?.permalinkPrefix))
	failures.push(`blog.config.article.permalinkPrefix 必须为非空字符串: ${String(config.article?.permalinkPrefix)}`)
if (!isPositiveInteger(config.feed?.limit))
	failures.push(`blog.config.feed.limit 必须为正整数: ${String(config.feed?.limit)}`)
if (!isPositiveInteger(config.pagination?.perPage))
	failures.push(`blog.config.pagination.perPage 必须为正整数: ${String(config.pagination?.perPage)}`)
if (typeof config.feed?.enabled !== 'boolean' || typeof config.feed?.enableStyle !== 'boolean')
	failures.push('blog.config.feed.enabled 和 feed.enableStyle 必须为布尔值')
if (!Array.isArray(config.seo?.robotsNotIndex) || !config.seo.robotsNotIndex.every(item => typeof item === 'string'))
	failures.push('blog.config.seo.robotsNotIndex 必须为字符串数组')
if (typeof config.generator?.useRandomPostid !== 'boolean')
	failures.push('blog.config.generator.useRandomPostid 必须为布尔值')
if (config.home?.mode !== 'home' && config.home?.mode !== 'articles')
	failures.push('blog.config.home.mode 必须为 home 或 articles')
for (const section of ['hero', 'profile', 'career', 'skills', 'sponsors']) {
	if (typeof config.home?.sections?.[section] !== 'boolean')
		failures.push(`blog.config.home.sections.${section} 必须为布尔值`)
}
if (!isNonEmptyString(config.home?.hero?.greeting))
	failures.push('blog.config.home.hero.greeting 必须为非空字符串')
if (config.home?.hero?.watermark !== undefined && typeof config.home.hero.watermark !== 'string')
	failures.push('blog.config.home.hero.watermark 必须为字符串')
if (typeof config.home?.hero?.button?.enabled !== 'boolean')
	failures.push('blog.config.home.hero.button.enabled 必须为布尔值')
for (const section of ['profile', 'career', 'skills', 'sponsors']) {
	if (!isNonEmptyString(config.home?.sectionTitles?.[section]))
		failures.push(`blog.config.home.sectionTitles.${section} 必须为非空字符串`)
}
if (!isNonEmptyString(config.home?.location?.text))
	failures.push('blog.config.home.location.text 必须为非空字符串')
if (!isNonEmptyString(config.home?.mbti?.linkText))
	failures.push('blog.config.home.mbti.linkText 必须为非空字符串')
if (typeof config.features?.share?.enabled !== 'boolean')
	failures.push('blog.config.features.share.enabled 必须为布尔值')
for (const feature of ['moments', 'circle'] as const) {
	if (!isNonEmptyString(config.features?.[feature]?.title))
		failures.push(`blog.config.features.${feature}.title 必须为非空字符串`)
	if (!isNonEmptyString(config.features?.[feature]?.description))
		failures.push(`blog.config.features.${feature}.description 必须为非空字符串`)
	if (!isPositiveInteger(config.features?.[feature]?.pageSize))
		failures.push(`blog.config.features.${feature}.pageSize 必须为正整数`)
	if (typeof config.features?.[feature]?.showPoweredBy !== 'boolean')
		failures.push(`blog.config.features.${feature}.showPoweredBy 必须为布尔值`)
}
if (!Array.isArray(config.features?.music?.metingApis) || !config.features.music.metingApis.every(item => isHttpUrl(item)))
	failures.push('blog.config.features.music.metingApis 必须为 HTTP URL 数组')
if (!isHttpUrl(config.features?.music?.soundfontsUrl))
	failures.push('blog.config.features.music.soundfontsUrl 非法')
if (!Array.isArray(config.seo?.antiMirrorBlacklist) || !config.seo.antiMirrorBlacklist.every(item => typeof item === 'string'))
	failures.push('blog.config.seo.antiMirrorBlacklist 必须为字符串数组')
if (config.footer?.copyright !== undefined && config.footer.copyright !== '' && !isNonEmptyString(config.footer.copyright))
	failures.push('blog.config.footer.copyright 必须为字符串')
for (const page of ['home', 'link', 'archive'] as const) {
	if (typeof config.pages?.[page]?.enabled !== 'boolean')
		failures.push(`blog.config.pages.${page}.enabled 必须为布尔值`)
}
if (typeof config.pages?.link?.remindNoFeed !== 'boolean' || typeof config.pages?.link?.randomInGroup !== 'boolean')
	failures.push('blog.config.pages.link.remindNoFeed 和 pages.link.randomInGroup 必须为布尔值')
if (!isNonEmptyString(config.pages?.blog?.title))
	failures.push('blog.config.pages.blog.title 必须为非空字符串')
if (!isNonEmptyString(config.pages?.link?.title) || !isNonEmptyString(config.pages?.link?.description))
	failures.push('blog.config.pages.link.title 和 pages.link.description 必须为非空字符串')
for (const tab of ['mine', 'apply'] as const) {
	if (!isNonEmptyString(config.pages?.link?.tabs?.[tab]))
		failures.push(`blog.config.pages.link.tabs.${tab} 必须为非空字符串`)
}
if (!isNonEmptyString(config.pages?.archive?.title))
	failures.push('blog.config.pages.archive.title 必须为非空字符串')
for (const row of ['date', 'updated', 'category', 'words'] as const) {
	if (typeof config.ui?.article?.info?.[row] !== 'boolean')
		failures.push(`blog.config.ui.article.info.${row} 必须为布尔值`)
}
if (typeof config.ui?.article?.copyright?.enabled !== 'boolean' || !isNonEmptyString(config.ui?.article?.copyright?.title))
	failures.push('blog.config.ui.article.copyright.enabled 必须为布尔值且 copyright.title 必须为非空字符串')
for (const fallback of ['nextFallback', 'prevFallback'] as const) {
	if (!isNonEmptyString(config.ui?.article?.surround?.[fallback]))
		failures.push(`blog.config.ui.article.surround.${fallback} 必须为非空字符串`)
}
if (typeof config.ui?.sidebar?.themeToggle !== 'boolean')
	failures.push('blog.config.ui.sidebar.themeToggle 必须为布尔值')
if (typeof config.ui?.sidebar?.blogInfo?.enabled !== 'boolean' || !isNonEmptyString(config.ui?.sidebar?.blogInfo?.title))
	failures.push('blog.config.ui.sidebar.blogInfo.enabled 必须为布尔值且 blogInfo.title 必须为非空字符串')
for (const row of ['uptime', 'lastUpdated', 'buildPlatform'] as const) {
	if (typeof config.ui?.sidebar?.blogInfo?.[row] !== 'boolean')
		failures.push(`blog.config.ui.sidebar.blogInfo.${row} 必须为布尔值`)
}
if (typeof config.ui?.sidebar?.blogInfo?.imageBed?.enabled !== 'boolean' || (config.ui.sidebar.blogInfo.imageBed.enabled && !isNonEmptyString(config.ui.sidebar.blogInfo.imageBed.name)))
	failures.push('blog.config.ui.sidebar.blogInfo.imageBed.enabled 必须为布尔值，启用时 imageBed.name 必须为非空字符串')
if (typeof config.ui?.slide?.enabled !== 'boolean' || !isNonEmptyString(config.ui?.slide?.tag) || !isPositiveInteger(config.ui?.slide?.autoplayDelay))
	failures.push('blog.config.ui.slide.enabled 必须为布尔值，slide.tag 必须为非空字符串，slide.autoplayDelay 必须为正整数')
for (const row of ['enabled', 'random', 'rss'] as const) {
	if (typeof config.ui?.slide?.aside?.[row] !== 'boolean')
		failures.push(`blog.config.ui.slide.aside.${row} 必须为布尔值`)
}
for (const styles of ['externalStyles', 'preconnects'] as const) {
	if (!Array.isArray(config.ui?.[styles]) || !config.ui[styles].every(item => isHttpUrl(item)))
		failures.push(`blog.config.ui.${styles} 必须为 HTTP URL 数组`)
}
if (!['system', 'light', 'dark'].includes(String(config.theme?.default)))
	failures.push('blog.config.theme.default 必须为 system、light 或 dark')

try {
	const redirects = JSON.parse(await readFile(projectPath('redirects.json'), 'utf8')) as unknown
	if (!redirects || typeof redirects !== 'object' || Array.isArray(redirects)) {
		failures.push('redirects.json 顶层必须为对象')
	}
	else {
		for (const [source, target] of Object.entries(redirects)) {
			if (!isSitePathOrHttpUrl(source))
				failures.push(`redirects.json source 非法: ${source}`)
			if (!isSitePathOrHttpUrl(target))
				failures.push(`redirects.json target 非法 (${source}): ${String(target)}`)
			if (isSitePathOrHttpUrl(source) && isSitePathOrHttpUrl(target) && normalizedUrlPath(source) === normalizedUrlPath(target))
				failures.push(`redirects.json 禁止 self redirect: ${source} -> ${String(target)}`)
		}
	}
}
catch (error) {
	failures.push(`redirects.json 无法读取或解析: ${error instanceof Error ? error.message : String(error)}`)
}

reportResult('config', failures)
