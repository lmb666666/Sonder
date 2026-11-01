import { getEntry } from 'astro:content';

export async function getSiteConfig() {
  const entry = await getEntry('siteConfig', 'config');

  if (!entry) {
    throw new Error('Missing site config entry in site.config.toml');
  }

  return entry.data;
}

export async function getThemePalette() {
  const { theme } = await getSiteConfig();

  return theme.palette;
}

interface TopNavLinkConfig {
  label: string;
  href?: string;
  module?: string;
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

export function resolveTopNavLinks(links: TopNavLinkConfig[]): ResolvedTopNavLink[] {
  return links.flatMap((link) => {
    if (link.disabled || !link.href) return [];

    return [{ label: link.label, href: link.href }];
  });
}

export function getRouteLabels(): Record<string, string> {
  return {
    '/blog': 'blog',
    '/archive': 'archive',
    '/about': 'about',
  };
}

export type SiteConfig = Awaited<ReturnType<typeof getSiteConfig>>;
export type ThemePalette = SiteConfig['theme']['palette'];
export type SiteProfile = SiteConfig['profile'];
export type SiteTheme = SiteConfig['theme'];
export type SiteLink = SiteConfig['topNav']['links'][number];
export type SiteSearch = SiteConfig['search'];
export type SiteMath = SiteConfig['markdown'];
export type SiteFonts = SiteConfig['fonts'];
export type SitePages = SiteConfig['pages'];
export type HomeLinkItem = SiteConfig['home']['links'][number];
export type HomeIntro = SiteConfig['home']['intro'];
export type HomeQuote = SiteConfig['home']['quote'];
export type HomeLatest = SiteConfig['home']['latest'];
