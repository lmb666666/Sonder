import { getCollection } from 'astro:content';
import { getSiteConfig } from '../data/site';
import { sortByDateDesc } from '../lib/content-dates';
import { escapeXml } from '../lib/xml';
import { withBase } from '../lib/url';

export async function GET(context) {
  const { site } = await getSiteConfig();
  const origin = context.site ?? new URL(site.url);
  const posts = sortByDateDesc(await getCollection('blog', ({ data }) => !data.draft)).slice(0, 50);
  const updated = posts[0]?.data.date ?? new Date();
  const iso = (date) => date.toISOString();

  const entries = posts
    .map((post) => {
      const url = new URL(withBase(`/blog/${post.id}/`), origin);
      const categories = [...new Set([...(post.data.categories ?? []), ...(post.data.tags ?? [])])]
        .map((label) => `    <category term="${escapeXml(label)}" />`)
        .join('\n');

      return `  <entry>
    <title type="html">${escapeXml(post.data.title)}</title>
    <link rel="alternate" type="text/html" href="${url}" />
    <id>${url}</id>
    <published>${iso(post.data.date)}</published>
    <updated>${iso(post.data.date)}</updated>
    <summary>${escapeXml(post.data.description)}</summary>
${categories}
  </entry>`;
    })
    .join('\n');

  const atom = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="${withBase('/atom.xsl')}"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(site.title)}</title>
  <subtitle>${escapeXml(site.description)}</subtitle>
  <id>${new URL(withBase('atom.xml'), origin)}</id>
  <updated>${iso(updated)}</updated>
  <link rel="alternate" type="text/html" href="${new URL(withBase('/'), origin)}" />
  <link rel="self" type="application/atom+xml" href="${new URL(withBase('atom.xml'), origin)}" />
  <author>
    <name>Sonder</name>
  </author>
${entries}
</feed>`;

  return new Response(atom, {
    headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
  });
}
