export const profile = {
  name: 'dodola',
  handle: '@dodolalorc',
  role: '探索 AI 时代的新工具',
  company: '字节跳动 Bytedance',
  location: 'Hangzhou, Zhejiang',
  email: 'dodolalorc@gmail.com',
  website: 'https://dodolalorc.cn/',
  github: 'https://github.com/dodolalorc',
  meta: 'INTJ-A | Born in 2002',
  avatar: 'https://github.com/dodolalorc.png',
};

export const navigationLinks = [
  {
    icon: 'compass',
    title: '个人网站',
    subtitle: 'dodolalorc.cn',
    href: profile.website,
  },
  {
    icon: 'github',
    title: 'GitHub',
    subtitle: 'github.com/dodolalorc',
    href: profile.github,
  },
  {
    icon: 'pen',
    title: 'Blog 生活小记',
    subtitle: '记录生活与思考',
    href: '/blog',
  },
  {
    icon: 'mail',
    title: 'Email',
    subtitle: profile.email,
    href: `mailto:${profile.email}`,
  },
];

export const quote = {
  text: [
    'Many things are not meant to',
    'remain stable forever,',
    'so I prefer to keep myself adaptable',
    '— always able to move forward,',
    'rebuild, and begin again.',
  ],
  image: '/images/asuka.png',
};

export const intro = {
  title: "Hi, I'm dodola",
  body: [
    '热爱技术、喜欢折腾，持续构建中。',
    '专注于 AI 技术与全栈工程实践，在效率工具、知识管理、自动化与独立开发领域不断探索。',
    '相信代码可以改变世界，也相信记录可以改变自己。',
  ],
  image: '/images/pixel-girl.svg',
};

export const githubStats = {
  username: 'dodolalorc',
  profileUrl: profile.github,
  baseUrl: 'https://github-readme-stats-two-sand-73.vercel.app',
  cards: [
    {
      endpoint: '/api',
      alt: 'dodola GitHub stats',
      params: {
        show_icons: true,
        include_all_commits: true,
        count_private: true,
        rank_icon: 'github',
        hide_border: true,
        bg_color: '00000000',
        title_color: '142033',
        text_color: '4d5d72',
        icon_color: '18b98a',
        ring_color: '21a575',
        locale: 'cn',
        custom_title: 'dodola GitHub Stats',
      },
    },
    {
      endpoint: '/api/top-langs',
      alt: 'dodola most used languages',
      params: {
        layout: 'compact',
        langs_count: 8,
        hide_border: true,
        bg_color: '00000000',
        title_color: '142033',
        text_color: '4d5d72',
        locale: 'cn',
        custom_title: 'Most Used Languages',
      },
    },
  ],
};

export const connectLinks = [
  { label: 'GitHub', href: profile.github, icon: 'github' },
  { label: 'Bilibili', href: 'https://space.bilibili.com/', icon: 'bilibili' },
  { label: '小红书', href: 'https://www.xiaohongshu.com/', icon: 'book' },
  { label: '掘金', href: 'https://juejin.cn/', icon: 'juejin' },
  { label: 'Email', href: `mailto:${profile.email}`, icon: 'mail' },
];

export const doingItems = [
  { text: 'AI + Bookmark 知识库系统', mark: '📖' },
  { text: '个人网站与博客系统重构', mark: '💻' },
  { text: 'GitHub Actions 自动化工作流', mark: '⚡' },
  { text: 'AI 工具集与效率提升实践', mark: '🤖' },
  { text: '独立开发小项目探索', mark: '🚀' },
];
