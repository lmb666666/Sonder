import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { getSiteConfig } from '../data/site';
import { withBase } from '../lib/url';
import { sortByDateDesc } from '../lib/content-dates';

export async function GET(context: APIContext) {
  const { site, profile } = await getSiteConfig();
  const origin = context.site ?? new URL(site.url);
  const url = (path: string) => new URL(withBase(path), origin).href;
  const posts = sortByDateDesc(await getCollection('blog', ({ data }) => !data.draft));

  const postLines = posts
    .map((post) => `- [${post.data.title}](${url(`/blog/${post.id}/`)}): ${post.data.description}`)
    .join('\n');

  const body = `# ${site.title}

> ${site.description}

- 站点：${url('/')}
- 博主：${profile.name}（${profile.role}）
- 订阅：${url('atom.xml')}（Atom）、${url('rss.xml')}（RSS 2.0）
- 友链订阅（OPML）：${url('opml.xml')}
- 页面：文章 ${url('blog/')}、动态 ${url('moments')}、朋友 ${url('links')}、书影音 ${url('media')}、关于（含项目） ${url('about')}

## 文章

${postLines}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
