import { getSiteConfig } from '../config';
import { resolveYoulinConfig } from '../config/youlin';
import { friendLinkGroups } from '../data/friends';
import { isPlaceholderFeed } from '../lib/friend-data';
import { resolveFriendLinkGroups } from '../lib/friend-sources';
import { escapeXml } from '../lib/xml';
import { withBase } from '../lib/url';

export async function GET(context) {
  const siteConfig = await getSiteConfig();
  const { site } = siteConfig;
  const origin = context.site ?? new URL(site.url);
  const youlin = resolveYoulinConfig(siteConfig.youlin);
  const resolved = await resolveFriendLinkGroups(
    youlin,
    { localGroups: friendLinkGroups },
    { skipYoulin: youlin.links.mode === 'client' },
  );

  for (const error of resolved.errors) {
    console.warn(`[sonder friends] ${error}`);
  }

  const subscribable = resolved.groups
    .flatMap((group) => group.items)
    .filter((friend) => {
      const feedUrl = friend.rss?.trim();
      return Boolean(feedUrl) && !isPlaceholderFeed(feedUrl);
    });

  const outlines = subscribable
    .map((friend) => {
      const feedUrl = String(friend.rss ?? '').trim();
      const resolvedFeed = /^https?:\/\//i.test(feedUrl)
        ? feedUrl
        : new URL(withBase(feedUrl), origin).toString();
      const htmlUrl = friend.url
        ? friend.url.startsWith('http')
          ? friend.url
          : new URL(withBase(friend.url), origin).toString()
        : '';
      return `    <outline type="rss" text="${escapeXml(friend.name ?? '')}" title="${escapeXml(
        friend.name ?? '',
      )}" xmlUrl="${escapeXml(resolvedFeed)}" htmlUrl="${escapeXml(htmlUrl)}" />`;
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
