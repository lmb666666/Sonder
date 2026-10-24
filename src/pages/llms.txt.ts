import { getCollection } from 'astro:content';
import { getSiteConfig } from '../data/site';
import { sortByDateDesc } from '../utils/content-dates';

export async function GET(context) {
  const { site, profile } = await getSiteConfig();
  const origin = context.site ?? new URL(site.url);
  const posts = sortByDateDesc(await getCollection('blog', ({ data }) => !data.draft));

  const postLines = posts
    .map(
      (post) =>
        `- [${post.data.title}](${new URL(`/blog/${post.id}/`, origin)}): ${post.data.description}`,
    )
    .join('\n');

  const body = `# ${site.title}

> ${site.description}

- 站点：${origin}
- 标语：万千人生，各自成书
- 博主：${profile.name}（${profile.role}）
- 订阅：${new URL('atom.xml', origin)}（Atom）、${new URL('rss.xml', origin)}（RSS 2.0）
- 友链订阅（OPML）：${new URL('opml.xml', origin)}
- 页面：博客 ${new URL('blog/', origin)}、动态 ${new URL('moments', origin)}、朋友圈 ${new URL('circle', origin)}、友链 ${new URL('links', origin)}、书影音 ${new URL('media', origin)}、项目 ${new URL('projects', origin)}、关于 ${new URL('about', origin)}

## 文章

${postLines}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
