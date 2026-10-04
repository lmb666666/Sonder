import type { BlogConfig } from '../types/blog-config'
import type { FeedEntry } from '../types/feed'

/** Derive the site's own feed entry from the shared site identity and friend-link settings. */
export function getMyFeed(config: Pick<BlogConfig, 'author' | 'title' | 'subtitle' | 'description' | 'url' | 'favicon' | 'timeEstablished' | 'pages'>): FeedEntry {
	const { myInfo } = config.pages.link
	return {
		author: config.author.name,
		sitenick: myInfo.sitenick,
		title: config.title,
		desc: config.subtitle || config.description,
		link: config.url,
		feed: new URL('/atom.xml', config.url).toString(),
		icon: config.favicon,
		avatar: config.author.avatar,
		archs: myInfo.archs,
		date: config.timeEstablished,
		comment: myInfo.comment,
	}
}
