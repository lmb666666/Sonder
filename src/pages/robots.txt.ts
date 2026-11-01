import type { APIContext } from 'astro';
import { getSiteConfig } from '../config';
import { withBase } from '../lib/url';

export async function GET(context: APIContext) {
  const { site } = await getSiteConfig();
  const origin = context.site ?? new URL(site.url);

  const body = `User-agent: *
Allow: /

Sitemap: ${new URL(withBase('/sitemap-index.xml'), origin)}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
