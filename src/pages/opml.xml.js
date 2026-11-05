import { getSiteConfig } from '../config';
import { allFriendLinks } from '../data/friends';
import { isPlaceholderFeed } from '../lib/friend-data';
import { escapeXml } from '../lib/xml';
import { withBase } from '../lib/url';

export async function GET(context) {
  const { site } = await getSiteConfig();
  const origin = context.site ?? new URL(site.url);
  const subscribable = allFriendLinks.filter(
    (friend) => friend.rss?.trim() && !isPlaceholderFeed(friend.rss),
  );

  const outlines = subscribable
    .map((friend) => {
      const feedUrl = friend.rss.trim();
      const resolved = /^https?:\/\//i.test(feedUrl)
        ? feedUrl
        : new URL(withBase(feedUrl), origin).toString();
      const htmlUrl = friend.url.startsWith('http')
        ? friend.url
        : new URL(withBase(friend.url), origin).toString();
      return `    <outline type="rss" text="${escapeXml(friend.name)}" title="${escapeXml(friend.name)}" xmlUrl="${escapeXml(resolved)}" htmlUrl="${escapeXml(htmlUrl)}" />`;
    })
    .join('\n');

  const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>${escapeXml(site.title)} 友链订阅</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
  </head>
  <body>
    <outline text="${escapeXml(site.title)} 的友链 RSS">
${outlines}
    </outline>
  </body>
</opml>`;

  return new Response(opml, {
    headers: { 'Content-Type': 'text/x-opml+xml; charset=utf-8' },
  });
}
