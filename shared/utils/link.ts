import { fromUrl, parseDomain, ParseResultType } from 'parse-domain'
import { isPathFile } from 'site-config-stack/urls'

const domainTip: Record<string, string> = {
	'github.io': 'GitHub Pages 域名',
	'netlify.app': 'Netlify 域名',
	'pages.dev': 'Cloudflare 域名',
	'vercel.app': 'Vercel 域名',
	'zeabur.app': 'Zeabur 域名',
}

export function getDomain(url: string) {
	const domain = fromUrl(url)
	return typeof domain === 'symbol' ? url : domain
}

export function getMainDomain(url: string, useIcann?: boolean) {
	const hostname = getDomain(url)
	const parseResult = parseDomain(hostname)
	if (parseResult.type !== ParseResultType.Listed)
		return hostname
	const { domain, topLevelDomains } = useIcann ? parseResult.icann : parseResult
	return `${domain}.${topLevelDomains.join('.')}`
}

export function getDomainType(mainDomain: string) {
	return domainTip[mainDomain]
}

const githubUsernameRegex = /github\.com\/([a-zA-Z0-9-]+)(?:\/[^/]+)?(\/?)$/

export function getGithubUsername(url?: string) {
	if (!url)
		return ''
	return url.match(githubUsernameRegex)?.[1] ?? ''
}

export function isExtLink(url?: string) {
	return url
		? url.includes(':') || url.startsWith('//') || !!isPathFile(url)
		: false
}

function safeHttpUrl(value: unknown): string | undefined {
	if (typeof value !== 'string' || !value || value !== value.trim())
		return undefined
	if (value.startsWith('//') || [...value].some(char => char === '\\' || char.charCodeAt(0) <= 0x20 || char.charCodeAt(0) === 0x7F))
		return undefined
	try {
		const url = new URL(value)
		if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password)
			return undefined
		return url.href
	}
	catch {
		return undefined
	}
}

export function getSafeNavigationUrl(value: unknown) {
	return safeHttpUrl(value)
}

export function getSafeImageUrl(value: unknown) {
	return safeHttpUrl(value)
}

export function safelyDecodeUriComponent(str: string) {
	try {
		return decodeURIComponent(str)
	}
	catch {
		return str
	}
}
