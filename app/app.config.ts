import type { BlogConfig } from '~~/shared/types/blog-config'
import { Temporal } from 'temporal-polyfill'
import blogConfig from '~~/blog.config'

type AppRuntimeConfig = Omit<
	BlogConfig,
	| 'article'
	| 'author'
	| 'features'
	| 'feed'
	| 'favicon'
	| 'footer'
	| 'generator'
	| 'header'
	| 'comments'
	| 'defaultCategory'
	| 'seo'
	| 'scripts'
	| 'timeZone'
> & {
	article: Pick<BlogConfig['article'], 'categories'>
	author: Pick<BlogConfig['author'], 'name' | 'avatar'>
	comments: { twikoo: Pick<BlogConfig['features']['comments']['twikoo'], 'envId'> }
	features: Omit<BlogConfig['features'], 'comments'> & {
		comments: Pick<BlogConfig['features']['comments'], 'enabled'>
	}
	feed: Pick<BlogConfig['feed'], 'enabled'>
	footer: { copyright: string, nav: BlogConfig['footer']['nav'] }
	header: { emojiTail: BlogConfig['header']['emojiTail'], logo: string, subtitle?: string }
	themes: Record<'dark' | 'light' | 'system', { icon: string, tip: string }>
}

// Frontend-only projection of fields consumed through useAppConfig().
// @keep-sorted
export default defineAppConfig<AppRuntimeConfig>({
	// Fields consumed by site identity, article, and shared widgets.
	article: {
		categories: blogConfig.article.categories,
	},
	author: {
		avatar: blogConfig.author.avatar,
		name: blogConfig.author.name,
	},
	comments: { twikoo: { envId: blogConfig.features.comments.twikoo.envId } },
	copyright: {
		name: blogConfig.copyright.name,
		url: blogConfig.copyright.url,
	},
	description: blogConfig.description,
	features: {
		...blogConfig.features,
		comments: { enabled: blogConfig.features.comments.enabled },
	},
	feed: { enabled: blogConfig.feed.enabled },

	footer: {
		// Evaluated when app config is initialized; static generation may freeze this year at build time.
		// 自定义版权行留空时，回退为自动生成的 "© 年份 作者名" / Falls back to the generated "© year author" line when the custom one is empty
		copyright: blogConfig.footer.copyright || `© ${Temporal.Now.plainDateISO().year.toString()} ${blogConfig.author.name}`,
		nav: blogConfig.footer.nav,
	},
	header: {
		emojiTail: blogConfig.header.emojiTail,
		logo: blogConfig.author.avatar,
		subtitle: blogConfig.subtitle,
	},
	home: blogConfig.home,
	language: blogConfig.language,
	nav: blogConfig.nav.map(group => ({
		...group,
		items: group.items.filter((item) => {
			if (item.url === '/')
				return blogConfig.pages.home.enabled
			if (item.url === '/link')
				return blogConfig.pages.link.enabled
			if (item.url === '/archive')
				return blogConfig.pages.archive.enabled
			if (item.url === '/moments')
				return blogConfig.features.moments.enabled
			if (item.url === '/circle')
				return blogConfig.features.circle.enabled
			return true
		}),
	})),
	pages: blogConfig.pages,
	pagination: blogConfig.pagination,
	subtitle: blogConfig.subtitle,
	theme: blogConfig.theme,

	// Theme icons and labels are fixed presentation semantics, not blog settings.
	themes: {
		dark: {
			icon: 'tabler:moon',
			tip: '深色模式',
		},
		light: {
			icon: 'tabler:sun',
			tip: '浅色模式',
		},
		system: {
			icon: 'tabler:device-desktop',
			tip: '跟随系统',
		},
	},
	timeEstablished: blogConfig.timeEstablished,
	title: blogConfig.title,
	ui: {
		alert: blogConfig.ui.alert,
		article: blogConfig.ui.article,
		codeblock: blogConfig.ui.codeblock,
		excerpt: blogConfig.ui.excerpt,
		externalStyles: blogConfig.ui.externalStyles,
		preconnects: blogConfig.ui.preconnects,
		sidebar: blogConfig.ui.sidebar,
		slide: blogConfig.ui.slide,
	},
	url: blogConfig.url,
})
