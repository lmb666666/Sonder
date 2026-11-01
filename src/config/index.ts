import { getEntry } from 'astro:content';

export async function getSiteConfig() {
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
  const { topNav } = await getSiteConfig();
  return resolveTopNavLinks(topNav.links);
}

function resolveTopNavLinks(links: TopNavLinkConfig[]): ResolvedTopNavLink[] {
  return links.flatMap((link) => (link.disabled ? [] : [{ label: link.label, href: link.href }]));
}

export type SiteConfig = Awaited<ReturnType<typeof getSiteConfig>>;
export type SiteSearch = SiteConfig['search'];
