import type { Arch } from '../utils/icon'
import type { Nav } from './nav'

export interface BlogScript {
	src: string
	[key: string]: string | boolean | undefined
}

export interface HomeConfig {
	mode: 'home' | 'articles'
	aboutBio: string
	career: { period: string, title: string, description: string, current?: boolean }[]
	location: { city: string, country: string, mapDark: string, mapLight: string, text: string }
	mbti: { image: string, link: string, label: string, quote: string, type: string, linkText: string }
	skills: { name: string, percent: number }[]
	socialLinks: { icon: string, name: string, url: string }[]
	sponsorMethods: { name: string, qrCode: string, description: string, whiteBackground?: boolean }[]
	sponsors: { name: string, amount: string, date: string }[]
	sponsorUsage: string
	tags: string[]
	sections: { hero: boolean, profile: boolean, career: boolean, skills: boolean, sponsors: boolean }
	hero: {
		watermark: string
		greetingEmoji: string
		greeting: string
		button: { enabled: boolean, icon: string, text: string, url: string }
	}
	sectionTitles: { profile: string, career: string, skills: string, sponsors: string }
}

export interface BlogPagesConfig {
	home: { enabled: boolean }
	blog: { title: string }
	link: {
		enabled: boolean
		remindNoFeed: boolean
		randomInGroup: boolean
		title: string
		description: string
		tabs: { mine: string, apply: string }
		myInfo: { archs: Arch[], sitenick: string, comment: string }
	}
	archive: { enabled: boolean, title: string, description?: string }
}

export interface BlogExternalPageFeatureConfig extends BlogServiceFeatureConfig {
	/** 页面标题，同时用于 SEO 与页头 */
	title: string
	/** 页面描述，同时用于 SEO 与页头 */
	description: string
	/** 页头背景图，缺省使用 ui.article.fallbackCover */
	background?: string
	/** 单次加载/展示的条目数 */
	pageSize: number
	/** 是否显示 "Powered by ..." 服务署名 */
	showPoweredBy: boolean
}

export interface BlogArticleConfig {
	categories: Record<string, { icon: string, color?: string }>
	permalinkPrefix: string
}

export interface BlogGeneratorConfig {
	useRandomPostid: boolean
}

export interface BlogSeoConfig {
	robotsNotIndex: string[]
	antiMirrorBlacklist: string[]
}

export interface BlogServiceFeatureConfig {
	enabled: boolean
	apiUrl: string
}

export interface BlogFeatureConfig {
	enabled: boolean
}

export interface BlogCommentsConfig extends BlogFeatureConfig {
	twikoo: {
		/** Loaded only when the comments feature is enabled. */
		script: BlogScript
		envId: string
		preload: string
	}
}

export interface BlogConfig {
	title: string
	subtitle?: string
	description: string
	author: {
		name: string
		avatar: string
		email: string
		homepage: string
	}
	copyright: {
		name: string
		url: string
	}
	favicon: string
	language: string
	timeEstablished: string
	timeZone: string
	url: string
	defaultCategory: string
	article: BlogArticleConfig
	ui: {
		alert: { defaultStyle: 'card' | 'flat' }
		article: {
			fallbackCover: string
			/** 封面取色时走图像代理的域名白名单 */
			coverProxyHosts: string[]
			/** 文章页头信息行开关 */
			info: { date: boolean, updated: boolean, category: boolean, words: boolean }
			/** 文末版权块 */
			copyright: { enabled: boolean, title: string, text?: string }
			/** 上一篇/下一篇缺省文案 */
			surround: { nextFallback: string, prevFallback: string }
		}
		sidebar: {
			/** 侧边栏底部的主题切换按钮 */
			themeToggle: boolean
			blogInfo: {
				enabled: boolean
				title: string
				uptime: boolean
				lastUpdated: boolean
				buildPlatform: boolean
				imageBed: { enabled: boolean, name: string, icon: string }
			}
		}
		/** 精选文章展示区 */
		slide: {
			enabled: boolean
			tag: string
			autoplayDelay: number
			/** 右侧信息面板：站点速览统计与快捷操作 */
			aside: { enabled: boolean, random: boolean, rss: boolean }
		}
		/** 外部样式表（字体等），异步加载 */
		externalStyles: string[]
		/** 外部域名的 preconnect 提示 */
		preconnects: string[]
		codeblock: {
			triggerRows: number
			collapsedRows: number
			enableIndentGuide: boolean
			indent: number
			tabSize: number
		}
		excerpt: { animation: boolean, caret: string }
	}
	features: {
		comments: BlogCommentsConfig
		opml: BlogFeatureConfig
		search: BlogFeatureConfig
		sponsors: BlogFeatureConfig
		/** 文章页头"文字分享"按钮 */
		share: BlogFeatureConfig
		moments: BlogExternalPageFeatureConfig
		circle: BlogExternalPageFeatureConfig
		/** 音乐内嵌播放的第三方服务 */
		music: {
			/** Meting API 端点模板，支持 :server/:type/:id/:r 占位，按顺序降级 */
			metingApis: string[]
			/** abcjs 乐谱音源库地址，不可达时禁用播放能力 */
			soundfontsUrl: string
		}
	}
	feed: {
		enabled: boolean
		limit: number
		enableStyle: boolean
	}
	seo: BlogSeoConfig
	generator: BlogGeneratorConfig
	scripts: BlogScript[]
	home: HomeConfig
	pages: BlogPagesConfig
	theme: { default: 'system' | 'light' | 'dark' }
	footer: { nav: Nav, copyright?: string }
	header: { emojiTail: { enabled: boolean, items: string[] } }
	nav: Nav
	pagination: { perPage: number }
}
