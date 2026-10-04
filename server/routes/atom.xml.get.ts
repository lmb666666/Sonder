import type { ContentCollectionItem } from '@nuxt/content'
import { queryCollection } from '@nuxt/content/server'
import { pascalCase } from 'es-toolkit/string'
import XmlBuilder from 'fast-xml-builder'
import { Temporal } from 'temporal-polyfill'
import blogConfig from '~~/blog.config'
import packageJson from '~~/package.json'
import { toZonedTemporal } from '~~/shared/utils/time'

const runtimeConfig = useRuntimeConfig()

const builder = new XmlBuilder({
	attributeNamePrefix: '$',
	cdataPropName: '$',
	format: true,
	ignoreAttributes: false,
	textNodeName: '_',
})

function formatIsoDate(date?: string) {
	if (!date)
		return
	try {
		return toZonedTemporal(date).toInstant().toString()
	}
	catch {
		console.error('Invalid date format', date)
		return date
	}
}

function getUrl(path: string | undefined) {
	return new URL(path ?? '', blogConfig.url).toString()
}

type AtomPost = Pick<ContentCollectionItem, 'path' | 'title' | 'description' | 'image'>

function renderContent(post: AtomPost) {
	return [
		post.image && `<img src="${post.image}" alt="${post.title}" />`,
		post.description && `<p>${post.description}</p>`,
		`<a class="view-full" href="${getUrl(post.path)}" target="_blank">点击查看全文</a>`,
	].join(' ')
}

export default defineEventHandler(async (event) => {
	if (!blogConfig.feed.enabled)
		throw createError({ statusCode: 404, statusMessage: 'Not Found' })

	const posts = await queryCollection(event, 'content')
		.where('stem', 'LIKE', 'posts/%')
		.where('draft', '=', false)
		.order('updated', 'DESC')
		.limit(blogConfig.feed.limit)
		.select('author', 'categories', 'date', 'description', 'image', 'path', 'published', 'title', 'updated')
		.all()

	const entries = posts.map(post => ({
		id: getUrl(post.path),
		title: post.title ?? '',
		updated: formatIsoDate(post.updated),
		author: { name: post.author || blogConfig.author.name },
		content: {
			$type: 'html',
			$: renderContent(post),
		},
		link: { $href: getUrl(post.path) },
		summary: post.description,
		category: { $term: post.categories?.[0] },
		published: formatIsoDate(post.published ?? post.date),
	}))

	const feed = {
		$xmlns: 'http://www.w3.org/2005/Atom',
		id: blogConfig.url,
		title: blogConfig.title,
		updated: runtimeConfig.public.buildTime,
		description: blogConfig.description, // RSS 2.0
		author: {
			name: blogConfig.author.name,
			email: blogConfig.author.email,
			uri: blogConfig.author.homepage,
		},
		link: [
			{ $href: getUrl('atom.xml'), $rel: 'self' },
			{ $href: blogConfig.url, $rel: 'alternate' },
		],
		language: blogConfig.language, // RSS 2.0
		generator: {
			$uri: packageJson.homepage,
			$version: packageJson.version,
			_: pascalCase(packageJson.name),
		},
		icon: blogConfig.favicon,
		logo: blogConfig.author.avatar, // Ratio should be 2:1
		rights: `© ${Temporal.Now.plainDateISO().year.toString()} ${blogConfig.author.name}`,
		subtitle: blogConfig.subtitle || blogConfig.description,
		entry: entries,
	}

	return builder.build({
		'?xml': { $version: '1.0', $encoding: 'UTF-8' },
		'?xml-stylesheet': blogConfig.feed.enableStyle ? { $type: 'text/xsl', $href: '/assets/atom.xsl' } : undefined,
		feed,
	})
})
