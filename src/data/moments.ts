export interface MomentItem {
  id: string;
  content: string;
  /** ISO 日期 */
  date: string;
  tags?: string[];
  images?: string[];
  video?: { provider: 'bilibili' | 'youtube'; id: string };
  extension?: {
    type: 'github' | 'website' | 'music' | 'location';
    title: string;
    description?: string;
    url?: string;
  };
}

/**
 * 动态页内置演示数据。配置 Ech0 后端（site.toml [config.pages.moments].apiUrl）
 * 后，页面会改为在浏览器里拉取真实动态。
 */
export const demoMoments: MomentItem[] = [
  {
    id: 'demo-9',
    content:
      '把博客从 Nuxt 搬到 Astro 了。旧模板的十年，新模板的十分钟——构建快得让人怀疑是不是漏了页面。',
    date: '2026-10-24T12:00:00+08:00',
    tags: ['博客', 'astro'],
    extension: {
      type: 'github',
      title: 'Sonder',
      description: '万千人生，各自成书',
      url: 'https://github.com/lmb666666/Sonder',
    },
  },
  {
    id: 'demo-8',
    content: '乐谱组件调通了，发一段小星星庆祝一下。',
    date: '2026-10-20T21:30:00+08:00',
    tags: ['音乐'],
  },
  {
    id: 'demo-7',
    content: '傍晚的江边，风把云吹成了鱼鳞的样子。',
    date: '2026-10-15T18:47:00+08:00',
    images: ['/images/sample-bg.png', '/images/site-in-devices.png', '/images/blog-preview.png'],
    tags: ['生活'],
  },
  {
    id: 'demo-6',
    content: '这段视频讲透了静态站评论系统的几种做法，值得二刷。',
    date: '2026-10-08T22:10:00+08:00',
    video: { provider: 'bilibili', id: 'BV1GJ411x7h7' },
    tags: ['视频'],
  },
  {
    id: 'demo-5',
    content: '单曲循环一周了。',
    date: '2026-09-28T09:05:00+08:00',
    tags: ['音乐'],
    extension: {
      type: 'music',
      title: 'Another Love',
      description: 'Tom Odell',
      url: 'https://music.163.com/#/song?id=27919318',
    },
  },
  {
    id: 'demo-4',
    content: '新键盘到了。轴体是静音红的，深夜写东西再也不吵到人。',
    date: '2026-09-19T23:40:00+08:00',
    images: ['/images/only-intro.png', '/images/cover.png'],
    tags: ['数码'],
  },
  {
    id: 'demo-3',
    content: '出差路过老城区，导航把我带进一条巷子，反而是这一天最好的十五分钟。',
    date: '2026-09-11T16:20:00+08:00',
    extension: {
      type: 'location',
      title: '老城区',
    },
    tags: ['生活', '出差'],
  },
  {
    id: 'demo-2',
    content: '读《夜晚的潜水艇》，想象力是可以随身携带的逃生舱。',
    date: '2026-08-30T20:00:00+08:00',
    tags: ['读书'],
  },
  {
    id: 'demo-1',
    content: '动态页开张。以后碎碎念都发在这里，长文留给博客。',
    date: '2026-08-25T10:00:00+08:00',
    tags: ['博客'],
  },
];
