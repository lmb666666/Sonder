import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { getSiteConfig } from '../data/site';
import { sortByDateDesc } from '../lib/content-dates';
import { withBase } from '../lib/url';

export async function GET(context) {
  const { site } = await getSiteConfig();
  const origin = context.site ?? new URL(site.url);
  const posts = sortByDateDesc(await getCollection('blog', ({ data }) => !data.draft));

  return rss({
    title: site.title,
    description: site.description,
    site: new URL(withBase('/'), origin).href,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      categories: [...new Set([...(post.data.categories ?? []), ...(post.data.tags ?? [])])],
      link: new URL(withBase(`/blog/${post.id}/`), origin).href,
    })),
  });
}
