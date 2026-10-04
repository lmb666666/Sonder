import type { FeedEntry, FeedGroup } from '~/types/feed'
import XmlBuilder from 'fast-xml-builder'
import blogConfig from '~~/blog.config'
import { toZonedTemporal } from '~~/shared/utils/time'
import { getMyFeed } from '#shared/utils/my-feed'
import feeds from '~/feeds'

const myFeed = getMyFeed(blogConfig)
const runtimeConfig = useRuntimeConfig()
const builder = new XmlBuilder({
	attributeNamePrefix: '$',
	format: true,
	ignoreAttributes: false,
})

function mapEntry(item: FeedEntry) {
	return {
		$text: item.title || item.sitenick || item.author,
		$type: 'rss',
		$xmlUrl: item.feed,
		$created: toZonedTemporal(item.date).toInstant().toString(),
		$description: item.desc,
		$htmlUrl: item.link || item.feed,
	}
}

function flattenGroups(groups: FeedGroup[]) {
	return groups.flatMap(({ entries }) => entries.filter(({ feed }) => feed).map(mapEntry))
}

export async function getOpml() {
	if (!blogConfig.features.opml.enabled)
		throw createError({ statusCode: 404, statusMessage: 'Not Found' })

	const outlines = [
		mapEntry(myFeed),
		...flattenGroups(feeds),
	]

	const opml = {
		$version: '2.0',
		head: {
			title: `${blogConfig.title}的友链订阅`,
			dateCreated: toZonedTemporal(blogConfig.timeEstablished).toInstant().toString(),
			dateModified: runtimeConfig.public.buildTime,
			ownerName: blogConfig.author.name,
			ownerEmail: blogConfig.author.email,
			ownerId: blogConfig.author.homepage,
			docs: 'https://opml.org/spec2.opml',
		},
		body: { outline: outlines },
	}

	return builder.build({
		'?xml': { $version: '1.0', $encoding: 'UTF-8' },
		opml,
	})
}
