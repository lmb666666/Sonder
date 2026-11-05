import type { APIRoute } from 'astro';

import { getSiteConfig } from '../config';
import { PALETTE_THEME_COLORS } from '../config/palette';

export const GET: APIRoute = async () => {
  const { site, theme } = await getSiteConfig();
  const colors = PALETTE_THEME_COLORS[theme.palette];
  const manifest = {
    name: site.title,
    short_name: site.title,
    description: site.pageDescription || site.description,
    start_url: '.',
    display: 'standalone',
    background_color: colors.light,
    theme_color: colors.light,
    icons: [
      {
        src: 'icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  });
};
