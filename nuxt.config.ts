import { resolve } from 'node:path'
import { env } from 'node:process'
import { pathToFileURL } from 'node:url'
import { name as ciName, NETLIFY } from 'ci-info'
import { mapValues } from 'es-toolkit/object'
import { pascalCase } from 'es-toolkit/string'
import { Temporal } from 'temporal-polyfill'
import blogConfig from './blog.config'
import packageJson from './package.json'
import redirectList from './redirects.json'
import { getArticlePath } from './shared/utils/article'

function pluginPath(path: string) {
	return pathToFileURL(resolve(`./remark-plugins/${path}.ts`)).href
}

// 此处配置无需修改
export default defineNuxtConfig({
	app: {
		head: {
			meta: [
				{ name: 'author', content: [blogConfig.author.name, blogConfig.author.email].filter(Boolean).join(', ') },
				{ name: 'color-scheme', content: 'light dark' },
				// 此处为元数据的生成器标识，不建议修改
				{ 'name': 'generator', 'content': `${pascalCase(packageJson.name)} ${packageJson.version}`, 'data-github-repo': packageJson.homepage },
				{ name: 'mobile-web-app-capable', content: 'yes' },
			],
			link: [
				{ rel: 'icon', href: blogConfig.favicon },
				...(blogConfig.feed.enabled ? [{ rel: 'alternate', type: 'application/atom+xml', href: '/atom.xml' } as const] : []),
				...(blogConfig.features.comments.enabled ? [{ rel: 'preconnect', href: blogConfig.features.comments.twikoo.preload } as const] : []),
				{ rel: 'stylesheet', href: 'https://cdn.jsdmirror.com/ajax/libs/KaTeX/0.16.9/katex.min.css', media: 'print', onload: 'this.media="all"' },
				// 外部字体样式与 preconnect 来自 blog.config.ts 的 ui.externalStyles / ui.preconnects
				...blogConfig.ui.preconnects.map(href => ({ rel: 'preconnect', href, crossorigin: '' }) as const),
				...blogConfig.ui.externalStyles.map(href => ({ rel: 'stylesheet', href, media: 'print', onload: 'this.media="all"' }) as const),
			],
			templateParams: {
				separator: '|',
			},
			titleTemplate: `%s %separator ${blogConfig.title}`,
			script: [
				...blogConfig.scripts,
				...(blogConfig.features.comments.enabled ? [blogConfig.features.comments.twikoo.script] : []),
			],
		},
		rootAttrs: {
			id: 'blog-root',
		},
	},

	compatibilityDate: '2024-08-03',

	components: [
		{ path: '~/components/partial', prefix: 'Z' },
		'~/components',
	],

	css: [
		'@/assets/css/animation.scss',
		'@/assets/css/article.scss',
		'@/assets/css/color.scss',
		'@/assets/css/font.scss',
		'@/assets/css/main.scss',
		'@/assets/css/reusable.scss',
	],

	// @keep-sorted
	experimental: {
		extractAsyncDataHandlers: true,
		typescriptPlugin: true,
	},

	features: {
		inlineStyles: false,
	},

	nitro: {
		prerender: {
			ignore: [
				...(!blogConfig.features.moments.enabled ? ['/moments'] : []),
				...(!blogConfig.features.circle.enabled ? ['/circle'] : []),
			],
		},
	},

	// @keep-sorted
	routeRules: {
		...mapValues(redirectList, to => ({ redirect: { to, statusCode: 308 as const } })),
		'/api/stats': { prerender: true, headers: { 'Content-Type': 'application/json' } },
		...(blogConfig.feed.enabled ? { '/atom.xml': { prerender: true, headers: { 'Content-Type': 'application/xml' } } } : {}),
		'/favicon.ico': { redirect: { to: blogConfig.favicon } },
		...(blogConfig.features.opml.enabled
			? { '/feeds.opml.xml': { prerender: true, headers: { 'Content-Type': 'application/xml' } } }
			: {}),
	},

	runtimeConfig: {
		// @keep-sorted
		public: {
			buildTime: Temporal.Now.zonedDateTimeISO().toString(),
			// EdgeOne 检测暂时不可用
			ci: env.TENCENTCLOUD_RUNENV === 'SCF' ? 'EdgeOne' : ciName || '',
		},
	},

	/** 在生产环境启用 sourcemap */
	// sourcemap: true,

	typescript: {
		nodeTsConfig: {
			compilerOptions: {
				paths: {
					'#shared': ['../shared'],
					'#shared/*': ['../shared/*'],
				},
			},
			// @keep-sorted
			include: [
				'../remark-plugins/**/*.ts',
				'../scripts/**/*.ts',
			],
		},
	},

	vite: {
		css: {
			preprocessorOptions: {
				scss: {
					additionalData: '@use "@/assets/css/_variable.scss" as *;',
				},
			},
		},
		define: {
			/** 在生产环境启用 Vue DevTools */
			// __VUE_PROD_DEVTOOLS__: 'true',
			/** 在生产环境启用 Vue 水合不匹配详情 */
			// __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'true',
		},
		optimizeDeps: {
			// @keep-sorted
			include: ['@shikijs/colorized-brackets', '@shikijs/transformers', '@unhead/schema-org/vue', '@vue/devtools-core', '@vue/devtools-kit', 'embla-carousel-autoplay', 'embla-carousel-vue', 'embla-carousel-wheel-gestures', 'es-toolkit/array', 'es-toolkit/math', 'es-toolkit/object', 'es-toolkit/promise', 'es-toolkit/string', 'minisearch', 'parse-domain', 'plain-shiki', 'shiki/themes/catppuccin-latte.mjs', 'shiki/themes/one-dark-pro.mjs', 'temporal-polyfill', 'vue-tippy'],
		},
		server: {
			allowedHosts: true,
		},
	},

	// @keep-sorted
	modules: [
		'@bikariya/image-viewer',
		'@bikariya/modals',
		'@bikariya/shiki',
		'@nuxt/a11y',
		'@nuxt/content',
		'@nuxt/hints',
		'@nuxt/icon',
		'@nuxt/image',
		'@nuxtjs/color-mode',
		'@nuxtjs/seo',
		'@pinia/nuxt',
		'@vueuse/nuxt',
		'nuxt-llms',
		'unplugin-yaml/nuxt',
	],

	colorMode: {
		preference: blogConfig.theme.default,
		fallback: 'light',
		classSuffix: '',
	},

	content: {
		build: {
			markdown: {
				highlight: false,
				// @keep-sorted
				remarkPlugins: {
					[pluginPath('remark-mermaid')]: {},
					[pluginPath('remark-music')]: {},
					'remark-math': {},
					'remark-reading-time': {},
				},
				// @keep-sorted
				rehypePlugins: {
					[pluginPath('rehype-meta-slots')]: {},
					'rehype-katex': {},
				},
				toc: { depth: 4, searchDepth: 4 },
			},
		},
		experimental: {
			sqliteConnector: 'native',
		},
	},

	hooks: {
		'ready': () => {
			console.info(`
================================
${pascalCase(packageJson.name)} ${packageJson.version}
${packageJson.homepage}
================================
`)
		},
		'content:file:afterParse': (ctx) => {
			const { postid } = ctx.content as Record<string, unknown>
			if (postid === undefined)
				return

			const normalizedPostid = typeof postid === 'string'
				? postid
				: typeof postid === 'number' && Number.isSafeInteger(postid)
					? String(postid)
					: undefined

			if (normalizedPostid === undefined)
				throw new TypeError('Article postid must be a string or a safe integer')

			ctx.content.path = getArticlePath(normalizedPostid, blogConfig.article.permalinkPrefix)
		},
	},

	icon: {
		clientBundle: {
			scan: {
				globInclude: ['**\/*.{vue,jsx,tsx,ts,md,mdc,mdx}'],
			},
		},
	},

	image: {
		// 尽量以这些密度点对点显示
		densities: [1, 1.5, 2],
		format: ['avif', 'webp'],
		// Neylify 下 netlify 处理器无法显示站外图片，ipx 处理器无法显示站内图片，需彻底禁用
		// https://github.com/nuxt/image/issues/1353
		provider: NETLIFY ? 'none' : undefined,
	},

	linkChecker: {
		// @keep-sorted
		skipInspections: [
			'no-baseless',
			'no-non-ascii-chars',
			'no-uppercase-chars',
		],
	},

	llms: {
		domain: blogConfig.url,
		title: blogConfig.title,
		description: blogConfig.description,
		contentRawMarkdown: {
			excludeCollections: ['content'],
		},
		sections: [{
			title: 'Articles',
			contentCollection: 'content',
			contentFilters: [
				{ field: 'stem', operator: 'LIKE', value: 'posts/%' },
				// Nuxt Content serializes boolean filters as 0/1; its generated type incorrectly only allows strings.
				{ field: 'draft', operator: '=', value: false as unknown as string },
			],
		}],
	},

	ogImage: {
		enabled: false,
	},

	robots: {
		disableNuxtContentIntegration: true,
		disallow: blogConfig.seo.robotsNotIndex,
	},

	site: {
		name: blogConfig.title,
		url: blogConfig.url,
		defaultLocale: blogConfig.language,
	},

	// 未启用的功能页不会被预渲染，也不应出现在 sitemap 里
	sitemap: {
		exclude: [
			...(!blogConfig.features.moments.enabled ? ['/moments'] : []),
			...(!blogConfig.features.circle.enabled ? ['/circle'] : []),
		],
	},
})
