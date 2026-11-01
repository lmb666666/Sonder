import { getEntry } from 'astro:content';
import sonderConfig from '../../sonder.config';
import {
  getConfiguredPageModules,
  getResolvedPageModule,
  getResolvedPageModules,
  normalizeModuleRoute,
} from '../plugins/config';
import type { SonderConfig } from '../plugins/types';

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

function linkMatchesModule(href: string, moduleRoute: string) {
  if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('#')) {
    return false;
  }

  const normalizedHref = normalizeModuleRoute(href);

  return normalizedHref === moduleRoute;
}

export async function getTopNavLinks() {
  const { topNav } = await getSiteConfig();
  return resolveTopNavLinks(topNav.links, sonderConfig);
}

export function resolveTopNavLinks(
  links: TopNavLinkConfig[],
  config: SonderConfig,
): ResolvedTopNavLink[] {
  const configuredModules = getConfiguredPageModules(config);

  return links.flatMap((link) => {
    if (link.disabled) return [];

    if (link.module) {
      const resolvedModule = getResolvedPageModule(config, link.module);

      if (!resolvedModule) return [];

      return [
        {
          label: link.label || resolvedModule.nav.label,
          href: resolvedModule.route,
        },
      ];
    }

    const href = link.href;

    if (!href) return [];

    const matchedModule = configuredModules.find((module) =>
      linkMatchesModule(href, normalizeModuleRoute(module.route)),
    );

    if (!matchedModule) {
      return [
        {
          label: link.label,
          href,
        },
      ];
    }

    const resolvedModule = getResolvedPageModule(config, matchedModule.id);

    if (!resolvedModule) return [];

    return [
      {
        label: link.label,
        href: resolvedModule.route,
      },
    ];
  });
}

export function getRouteLabels(): Record<string, string> {
  const routeLabels: Record<string, string> = {
    '/blog': 'blog',
    '/archive': 'archive',
    '/about': 'about',
  };

  for (const module of getResolvedPageModules(sonderConfig)) {
    routeLabels[module.route] = module.id;
  }

  return routeLabels;
}

export type SiteConfig = Awaited<ReturnType<typeof getSiteConfig>>;
export type ThemePalette = SiteConfig['theme']['palette'];
export type SiteProfile = SiteConfig['profile'];
export type SiteTheme = SiteConfig['theme'];
export type SiteLink = SiteConfig['topNav']['links'][number];
export type SiteSearch = SiteConfig['search'];
export type SiteMath = SiteConfig['math'];
export type SiteFonts = SiteConfig['fonts'];
export type SitePages = SiteConfig['pages'];
export type HomeLinkItem = SiteConfig['home']['links'][number];
export type HomeIntro = SiteConfig['home']['intro'];
export type HomeQuote = SiteConfig['home']['quote'];
export type HomeLatest = SiteConfig['home']['latest'];
