import { getSiteConfig } from '../data/site';

export async function GET(context) {
  const { site } = await getSiteConfig();
  const origin = context.site ?? new URL(site.url);

  const body = `User-agent: *
Allow: /

Sitemap: ${new URL('sitemap-index.xml', origin)}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
