import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { getSiteConfig } from '../data/site';
import { sortByDateDesc } from '../utils/content-dates';

export async function GET(context) {
  const { site } = await getSiteConfig();
  const posts = sortByDateDesc(await getCollection('blog', ({ data }) => !data.draft));

  return rss({
    title: site.title,
    description: site.description,
    site: context.site,
    items: posts.map((post) => ({
      ...post.data,
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      categories: Array.from(new Set([...post.data.categories, ...post.data.tags])),
      link: `/blog/${post.id}/`,
    })),
  });
}
