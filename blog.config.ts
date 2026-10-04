import type { BlogConfig } from './shared/types/blog-config'

export type { BlogConfig } from './shared/types/blog-config'

// 站点身份 / Site identity
// 仅修改引号内的内容；这些信息会显示在网站、订阅源和搜索结果中。
// Edit the quoted values only; these details appear on the site, feeds, and search results.
const basicConfig = {
	// 网站标题 / Site title
	title: 'Sonder',
	// 网站副标题 / Site subtitle
	subtitle: '每个人都有自己的故事',
	// 网站简介，会用于搜索引擎摘要 / Site description used for search snippets
	description: 'Sonder 是一个基于 Nuxt 的博客程序。每个人都是一部史诗，值得被写下、被看见。',
	author: {
		// 作者显示名称 / Author display name
		name: 'Your Name',
		// 作者头像图片地址 / Author avatar image URL
		avatar: '/images/logo.svg',
		// 联系邮箱 / Contact email
		email: 'hello@example.com',
		// 作者主页 / Author homepage
		homepage: 'https://example.com',
	},
	copyright: {
		// 版权名称 / Copyright name
		name: '署名-非商业性使用-相同方式共享 4.0 国际',
		// 版权协议说明页 / Copyright license page
		url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans',
	},
	// 网站图标地址 / Site favicon URL
	favicon: '/images/logo.svg',
	// 网站语言代码 / Site language code
	language: 'zh-CN',
	// 网站建立日期 / Site establishment date
	timeEstablished: '2026-10-04',
	// 日期显示使用的时区 / Time zone used for dates
	timeZone: 'Asia/Shanghai',
	// 网站完整网址，不要带末尾斜杠 / Canonical site URL, without trailing slash
	url: 'https://sonder.liang.one',
	// 未指定分类时使用的名称 / Category used when none is specified
	defaultCategory: '未分类',
}

// 用户可调整的站点设置 / User-adjustable site settings
const blogConfig = {
	...basicConfig,

	// ==================== 文章与 SEO / Articles and SEO ====================
	article: {
		// 以下为分类示例，可自由增删、改名、换图标和颜色 / Examples only; add, remove, rename, or restyle them freely
		categories: {
			// 未指定分类时使用的默认分类 / Fallback category when a post has no category
			[basicConfig.defaultCategory]: { icon: 'tabler:circle-dashed' },
			// 每项可设置 icon 图标名和可选 color 颜色 / Each item may set an icon name and optional color
			生活: { icon: 'tabler:leaf', color: '#ff7777' },
			杂谈: { icon: 'tabler:message', color: '#33bbaa' },
			笔记: { icon: 'tabler:mouse', color: '#33aaff' },
		},
		permalinkPrefix: 'posts',
	},
	seo: {
		/** 不允许搜索引擎收录的路径 / Paths excluded from search indexing */
		robotsNotIndex: ['/preview'],
		// 反镜像域名黑名单：克隆站载入页面时会跳回本站 / Anti-mirror domain blacklist; visitors on mirror sites get redirected back to the original site
		antiMirrorBlacklist: [],
	},
	// 仅供文章生成命令使用 / Writing-tool settings used by the new-post command
	generator: { useRandomPostid: true },

	// ==================== 功能与服务 / Features and services ====================
	// 功能开关与相关服务配置 / Feature switches and their service settings
	features: {
		comments: {
			enabled: false,
			// Twikoo 评论服务 / Twikoo comment service
			twikoo: {
				// Loaded only while the comments feature is enabled.
				script: { src: 'https://cdn.jsdmirror.com/npm/twikoo@1.7.20/dist/twikoo.min.js', defer: true },
				envId: '',
				preload: '',
			},
		},
		opml: { enabled: true },
		search: { enabled: true },
		sponsors: { enabled: false },
		// 文章页头"文字分享"按钮 / "Share as text" button in the post header
		share: { enabled: true },
		// 外部服务页面 / Pages backed by external services
		// 动态功能依赖 Ech0 服务：https://github.com/lin-snow/Ech0 / Moments are backed by the Ech0 service
		moments: {
			enabled: false,
			apiUrl: '',
			// 页面标题，同时用于 SEO 与页头 / Page title, used for both SEO and the page header
			title: '动态',
			// 页面描述，同时用于 SEO 与页头 / Page description, used for both SEO and the page header
			description: '记录生活点滴',
			// 页头背景图；留空则使用 ui.article.fallbackCover / Header background image; falls back to ui.article.fallbackCover when empty
			background: '/images/cover.svg',
			// 每次加载的动态条数 / Moments fetched per request
			pageSize: 20,
			// 是否显示 "Powered by Ech0" 署名，不影响"刷新缓存"按钮 / Show the "Powered by Ech0" credit; the cache refresh button is unaffected
			showPoweredBy: true,
		},
		// 朋友圈功能依赖 Friend-Circle-Lite 服务：https://github.com/willow-god/friend-circle-lite / Circle is backed by the Friend-Circle-Lite service
		circle: {
			enabled: false,
			apiUrl: '',
			// 页面标题，同时用于 SEO 与页头 / Page title, used for both SEO and the page header
			title: '朋友圈',
			// 页面描述，同时用于 SEO 与页头 / Page description, used for both SEO and the page header
			description: '来自友链的最新文章动态',
			// 页头背景图；留空则使用 ui.article.fallbackCover / Header background image; falls back to ui.article.fallbackCover when empty
			background: '/images/cover.svg',
			// 每次加载的文章数 / Articles loaded per batch
			pageSize: 20,
			// 是否显示 "Powered by Friend-Circle-Lite" 署名 / Show the "Powered by Friend-Circle-Lite" credit
			showPoweredBy: true,
		},
		// 文章内嵌音乐的第三方服务 / Third-party services for embedded music players
		music: {
			// Meting API 端点模板，按顺序降级尝试；支持 :server/:type/:id/:r 占位 / Meting API endpoint templates tried in order; :server/:type/:id/:r placeholders supported
			metingApis: [],
			// abcjs 乐谱音源库，不可达时禁用播放能力 / abcjs soundfont library; playback is disabled when unreachable
			soundfontsUrl: 'https://paulrosen.github.io/midi-js-soundfonts/',
		},
	},

	// ==================== 订阅 / Subscriptions ====================
	// Atom 订阅源设置 / Atom feed settings
	feed: {
		enabled: true,
		// 最大文章数 / Maximum number of posts
		limit: 50,
		// 是否启用 XSLT 样式 / Enable XSLT styling
		enableStyle: true,
	},

	// 页脚导航 / Footer navigation
	footer: {
		// 自定义版权行；留空则自动生成 "© 年份 作者名" / Custom copyright line; auto-generated as "© year author" when empty
		copyright: '',
		// 页脚链接分组 / Footer link groups
		nav: [
			{
				// 分组标题；items 中每项包含图标、显示文字和目标网址 / Group title; each item in items has an icon, label, and destination URL
				title: '探索',
				items: [
					// icon 支持图标名或图片地址 / icon may be an icon name or image URL
					{ icon: 'tabler:rss', text: 'Atom订阅', url: '/atom.xml' },
				],
			},
			{
				title: '社交',
				items: [
					{ icon: 'tabler:mail', text: basicConfig.author.email, url: `mailto:${basicConfig.author.email}` },
				],
			},
			{
				title: '信息',
				items: [
					{ icon: 'tabler:brand-github', text: 'Sonder', url: 'https://github.com/lmb666666/Sonder' },
				],
			},
		],
	},
	// 网站标题栏设置 / Site header settings
	header: {
		// 标题旁随机显示的装饰表情 / Decorative emoji shown beside the title
		emojiTail: { enabled: true, items: ['🌟', '🏖️', '💻', '📝', '🎵'] },
	},
	// 首页个人资料与赞助信息 / Homepage profile and sponsorship
	home: {
		mode: 'home',
		// 首页各区块开关 / Homepage section switches
		sections: { hero: true, profile: true, career: true, skills: true, sponsors: false },
		// 首页 hero 区 / Homepage hero section
		hero: {
			// 背景水印大字，留空则不显示 / Watermark character in the hero background; leave empty to hide
			watermark: 'S',
			// 问候语旁的装饰表情 / Decorative emoji beside the greeting
			greetingEmoji: '👋',
			// 问候语：{name} 占位会自动高亮为作者名，\n 表示换行 / Greeting text: the {name} placeholder is highlighted with the author name, \n starts a new line
			greeting: '你好，\n我是{name}',
			// 主按钮，显示在 socialLinks 按钮之前；enabled 为 false 时隐藏 / Primary button before the social link buttons; hidden when enabled is false
			button: { enabled: true, icon: 'ri:file-list-3-line', text: '博客', url: '/blog' },
		},
		// 各区块标题 / Section titles
		sectionTitles: {
			profile: '个人资料',
			career: '📚 生涯经历',
			skills: '💡 特长技能',
			sponsors: '赞助支持',
		},
		// 首页个人简介 / Short homepage biography
		aboutBio: '这是一个示例主页。你可以在 blog.config.ts 中介绍自己，记录经历与兴趣。',
		// 学习或工作经历 / Education or career timeline
		career: [
			// period 为时间范围，title 为经历名称，description 为说明，current 可标记当前经历 / period is the date range, title the role, description its details, and current marks an ongoing entry
			{ period: '2025', title: '开始记录', description: '用文字保存每一次发现。' },
			{ period: '2026 - 至今', title: '持续创作', description: '分享想法，探索更多可能。', current: true },
		],
		location: {
			// 城市和国家 / City and country
			city: '示例城市',
			country: '示例国家',
			// 深色和浅色主题分别使用的地图图片地址 / Map image URLs for dark and light themes
			mapDark: '/images/map.svg',
			mapLight: '/images/map.svg',
			// 位置句式：{country}/{city} 占位替换后加粗显示 / Location sentence: {country}/{city} placeholders are substituted and bolded
			text: '我现在住在 {country}，{city}',
		},
		mbti: {
			// image 为介绍图片，link 为说明链接，label 为称呼，quote 为引用语，type 为类型 / image is the profile image, link the reference, label the display name, quote the caption, and type the personality type
			image: '/images/profile.svg',
			link: '/posts/writing',
			label: '记录者',
			quote: '每个人都有值得被记录的故事。',
			type: 'STORY',
			// 说明链接的文字 / Text of the reference link
			linkText: '了解更多 →',
		},
		// 每项填写技能名称和掌握程度（0-100） / Each item has a skill name and proficiency level (0-100)
		skills: [
			{ name: '网站搭建', percent: 80 },
			{ name: 'Markdown', percent: 60 },
			{ name: '文字表达', percent: 60 },
			{ name: '博客写作', percent: 50 },
			{ name: '服务器运维', percent: 50 },
			{ name: '前端开发', percent: 30 },
			{ name: 'UI 设计', percent: 30 },
		],
		// 每项填写图标名、平台名称和个人主页网址 / Each item has an icon name, platform label, and profile URL
		socialLinks: [
			{ icon: 'tabler:rss', name: 'Atom', url: '/atom.xml' },
			{ icon: 'tabler:mail', name: 'Email', url: `mailto:${basicConfig.author.email}` },
		],
		// 每项填写方式名称、收款码图片地址和说明；whiteBackground 为透明底收款码垫白底 / Each item has a method name, QR image URL, and description; whiteBackground pads a transparent QR with white
		sponsorMethods: [],
		// 每项填写赞助者名称、金额和日期 / Each item has the sponsor name, amount, and date
		sponsors: [],
		// 赞助用途说明 / How sponsorship is used
		sponsorUsage: '您的赞助将用于服务器维护、内容创作和功能开发，帮助我持续提供优质内容。',
		// 首页个人标签 / Homepage profile tags
		tags: ['📝 写作', '💻 技术', '🌱 探索'],
	},
	// 侧边栏导航 / Sidebar navigation
	nav: [
		{
			// 分组标题；留空表示不显示标题 / Group title; leave empty to hide the heading
			title: '',
			items: [
				// 每项包含图标名、显示文字和站内或站外目标网址 / Each item has an icon name, label, and internal or external destination URL
				{ icon: 'tabler:home', text: '首页', url: '/' },
				{ icon: 'tabler:files', text: '博客', url: '/blog' },
				{ icon: 'tabler:link', text: '友链', url: '/link' },
				{ icon: 'tabler:archive', text: '归档', url: '/archive' },
				{ icon: 'mingcute:moment-line', text: '动态', url: '/moments' },
				{ icon: 'tabler:planet', text: '朋友圈', url: '/circle' },
			],
		},
	],
	// 列表分页 / Article list pagination
	pagination: { perPage: 10 },

	// ==================== 脚本 / Scripts ====================
	// 全站第三方脚本 / Site-wide third-party scripts
	// Loaded site-wide; scripts for individual features belong with their feature settings.
	scripts: [],

	// ==================== 界面 / Interface ====================
	pages: {
		home: { enabled: true },
		// 博客页标题，用于 <title> 与分页标题 / Blog page title, used in <title> and pagination titles
		blog: { title: '博客' },
		link: {
			enabled: true,
			remindNoFeed: true,
			randomInGroup: true,
			// 页面标题，同时用于 SEO / Page title, also used for SEO
			title: '友链',
			// 页面描述，同时用于 SEO / Page description, also used for SEO
			description: `${basicConfig.title}的友链与订阅。`,
			// "我的博客信息 / 申请友链"两个 Tab 的标题 / Titles of the "my blog info / apply for a link" tabs
			tabs: { mine: '我的博客信息', apply: '申请友链' },
			// 本站在友链场景的展示信息：技术架构、网站趣称、博主备注 / How this site presents itself among friends: tech stack, site nickname, and owner note
			myInfo: { archs: ['Nuxt'], sitenick: '博客', comment: '本站信息' },
		},
		archive: {
			enabled: true,
			// 页面标题，同时用于 SEO / Page title, also used for SEO
			title: '归档',
			// 页面描述；留空则使用 "${title}的所有文章归档。" / Page description; defaults to "${title}的所有文章归档。" when empty
			description: '',
		},
	},
	theme: { default: 'system' },
	// 界面外观与交互参数 / UI presentation and interaction settings
	ui: {
		// 提示框默认样式 / Default alert style
		// defaultStyle 可选 card 或 flat / defaultStyle can be card or flat
		alert: { defaultStyle: 'card' },
		article: {
			// 没有文章封面时使用的图片 / Fallback cover image for articles without one
			fallbackCover: '/images/cover.svg',
			// 封面取色时走图像代理的域名白名单（图床无 CORS 头时必需）/ Domains proxied during cover color extraction (needed for image beds without CORS headers)
			coverProxyHosts: [],
			// 页头信息行开关；单篇文章仍可用 frontmatter meta.hideInfo 整体隐藏 / Post header info row switches; a single post can still hide them all via frontmatter meta.hideInfo
			info: { date: true, updated: true, category: true, words: true },
			// 文末版权块 / Copyright block at the end of posts
			copyright: {
				// 是否显示；单篇文章可用 frontmatter meta.slots.copyright 覆盖 / Whether to show; a single post can override it via frontmatter meta.slots.copyright
				enabled: true,
				// 区块标题 / Block title
				title: '许可协议',
				// 自定义文案；留空则根据 copyright.name/url 生成默认句子 / Custom text; defaults to a sentence built from copyright.name/url when empty
				text: '',
			},
			// 上一篇/下一篇的缺省文案 / Fallback texts for the prev/next post links
			surround: {
				// 没有更新的文章时显示 / Shown when there is no newer post
				nextFallback: '新故事即将发生',
				// 没有更早的文章时显示 / Shown when there is no older post
				prevFallback: '已抵达博客尽头',
			},
		},
		// 侧边栏 / Sidebar
		sidebar: {
			// 底部主题切换按钮 / Theme toggle button in the sidebar footer
			themeToggle: true,
			// "博客信息"卡片 / "Blog Info" widget
			blogInfo: {
				// 是否显示整个卡片 / Show the whole card
				enabled: true,
				// 卡片标题 / Card title
				title: '博客信息',
				// "运营时长"行，基于 timeEstablished 计算 / Uptime row, derived from timeEstablished
				uptime: true,
				// "上次更新"行，显示构建时间 / Last updated row, showing the build time
				lastUpdated: true,
				// "构建平台"行，仅在检测到 CI 平台时显示 / Build platform row, shown only when a CI platform is detected
				buildPlatform: true,
				// "图片存储"行；enabled 为 false 时整行隐藏 / Image storage row; hidden when enabled is false
				imageBed: { enabled: false, name: '', icon: '' },
			},
		},
		// 推荐文章轮播 / Recommended posts carousel
		slide: {
			// 是否启用；没有 recommend 文章时本来就不显示 / Whether to enable; the carousel is absent anyway without recommended posts
			enabled: true,
			// 轮播左上角徽章文字 / Badge text at the top-left corner of the carousel
			tag: '精选文章',
			// 自动播放间隔（毫秒） / Autoplay interval in milliseconds
			autoplayDelay: 3500,
		},
		// 外部样式表（字体等），以 media=print 异步加载，不阻塞渲染 / External stylesheets (fonts etc.), async-loaded via media=print without render blocking
		externalStyles: [],
		// 需要提前建连的外部域名，一般是字体文件所在域 / External domains to preconnect, usually where the font files live
		preconnects: [],
		// 代码块的折叠和缩进显示设置 / Code block collapse and indentation settings
		codeblock: {
			// 超过此行数时显示折叠按钮 / Show the collapse button above this many lines
			triggerRows: 32,
			// 初始折叠时显示的行数 / Visible lines when initially collapsed
			collapsedRows: 16,
			// 是否显示缩进辅助线 / Show indentation guides
			enableIndentGuide: true,
			// 缩进宽度（空格数） / Indentation width in spaces
			indent: 4,
			// Tab 字符显示的空格数 / Number of spaces represented by a tab
			tabSize: 3,
		},
		// 文章摘要动画开关及动画光标字符 / Article excerpt animation toggle and animated caret character
		excerpt: { animation: true, caret: '_' },
	},
} satisfies BlogConfig

export default blogConfig
