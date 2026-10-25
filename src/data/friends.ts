import type { FriendLinkItem } from '../components/mdx/lib/friend-data';

export interface FriendLinkGroup {
  title: string;
  description?: string;
  items: FriendLinkItem[];
}

/**
 * 友链数据。卡片视觉由主题组件渲染：无头像时回退为首字母。
 * sticky 置顶（true 或权重数字）；rss 用于朋友圈聚合。
 */
export const friendLinkGroups: FriendLinkGroup[] = [
  {
    title: '技术伙伴',
    description: '写代码的人，和他们的博客。',
    items: [
      {
        name: '一叶之秋',
        url: 'https://example.com/blog',
        bio: '示例友链：记录折腾与思考',
      },
      {
        name: '南山客',
        url: 'https://example.org',
        bio: '示例友链：后端与运维笔记',
        rss: 'https://example.org/feed.xml',
      },
    ],
  },
  {
    title: '生活观察',
    description: '不写代码的时候，看看他们写什么。',
    items: [
      {
        name: '拾光集',
        url: 'https://example.net',
        bio: '示例友链：胶片与随笔',
      },
      {
        name: '慢速公路',
        url: 'https://example.dev',
        bio: '示例友链：旅行与饮食手账',
        rss: 'https://example.dev/atom.xml',
      },
    ],
  },
];

export const allFriendLinks: FriendLinkItem[] = friendLinkGroups.flatMap((group) => group.items);
