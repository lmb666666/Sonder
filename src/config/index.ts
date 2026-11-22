import { getEntry } from 'astro:content';

import type { SiteConfig } from './schema';

export type { SiteConfig };

export async function getSiteConfig(): Promise<SiteConfig> {
  const entry = await getEntry('siteConfig', 'config');

  if (!entry) {
    throw new Error('Missing site config entry in site.config.toml');
  }

  return entry.data;
}

interface TopNavLinkConfig {
  label: string;
  href: string;
  disabled?: boolean;
}

export interface ResolvedTopNavLink {
  label: string;
  href: string;
}

export async function getTopNavLinks() {
  const { nav } = await getSiteConfig();
  return resolveTopNavLinks(nav.links);
}

function resolveTopNavLinks(links: TopNavLinkConfig[]): ResolvedTopNavLink[] {
  return links.flatMap((link) => (link.disabled ? [] : [{ label: link.label, href: link.href }]));
}

export type SiteSearch = SiteConfig['nav']['search'];
