import type { FeedGroup } from '../../shared/types/feed'

// 在此添加友链；本站信息由 app/feeds.ts 自动注入。 / Add friend links here; app/feeds.ts injects the site's own entry.
export default [
	{
		name: '朋友们',
		desc: '在这里添加你关注的博客。',
		entries: [],
	},
] satisfies FeedGroup[]
