import type { FeedGroup } from './types/feed'
import { getMyFeed } from '#shared/utils/my-feed'
// 友链检测 CLI 需要使用显式导入和相对路径
import blogConfig from '../blog.config'
import friendFeeds from '../content/data/friend-feeds'

export const myFeed = getMyFeed(blogConfig)

// 友链数据在 content/data/friend-feeds.ts；"我的博客信息"固定置于第一个分组首位
// Friend data lives in content/data/friend-feeds.ts; the site's own entry is pinned to the top of the first group
const friendFeedGroups: FeedGroup[] = friendFeeds.map((group, index) =>
	index === 0 ? { ...group, entries: [myFeed, ...group.entries] } : group,
)

export default friendFeedGroups
