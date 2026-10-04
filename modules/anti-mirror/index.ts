import { defineNuxtModule } from 'nuxt/kit'
import { minifySync } from 'oxc-minify'
import blogConfig from '../../blog.config'
import handleMirror from './runtime/client'

// 黑名单来自 blog.config.ts 的 seo.antiMirrorBlacklist / The blacklist comes from seo.antiMirrorBlacklist in blog.config.ts
const blacklist = blogConfig.seo.antiMirrorBlacklist

export default defineNuxtModule({
	meta: {
		name: 'anti-mirror',
	},
	setup(options, nuxt) {
		(nuxt.options.app.head.script ??= []).push({
			innerHTML: toIifeString(handleMirror, blacklist.map(btoa), btoa(blogConfig.url)),
		})
	},
})

function toIifeString<T extends unknown[]>(fn: (...args: T) => void, ...args: T) {
	const fnString = fn.toString()
	const argsString = JSON.stringify(args).slice(1, -1)
	const minified = minifySync('', `(${fnString})(${argsString})`)
	return minified.code
}
