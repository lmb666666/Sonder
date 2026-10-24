export type NavfolioPageModuleId = string;

export type NavfolioPageModuleBuiltinId = 'projects' | 'vibe' | 'media';

export type NavfolioContentExtension = 'md' | 'mdx';

export interface NavfolioScaffoldTemplateContext {
  title: string;
  slug: string;
  isoDate: string;
  date: string;
}

export type NavfolioScaffoldTemplateVariable = 'title' | 'slug' | 'isoDate' | 'date';

export interface NavfolioPageModuleNav {
  label: string;
  href: string;
}

export interface NavfolioPageModuleScaffold {
  command: string;
  collection: string;
  directory: string;
  defaultExtension?: NavfolioContentExtension;
  template: URL;
}

export interface NavfolioPageModuleRoute {
  pattern?: string | ((moduleRoute: string) => string);
  entrypoint: URL;
  prerender?: boolean;
}

export interface NavfolioPageModule {
  id: NavfolioPageModuleId;
  enabled?: boolean;
  route: string;
  nav: NavfolioPageModuleNav;
  collections: string[];
  i18n?: NavfolioI18nContribution;
  scaffold?: NavfolioPageModuleScaffold;
  routes?: NavfolioPageModuleRoute[];
}

export interface NavfolioPageModuleOptions {
  enabled?: boolean;
  route?: string;
}

export interface ResolvedNavfolioPageModule extends NavfolioPageModule {
  enabled: true;
  route: string;
  nav: NavfolioPageModuleNav;
}

export interface NavfolioPagesPlugin {
  name: '@navfolio/pages';
  enabled?: boolean;
}
import type { NavfolioI18nContribution } from '@navfolio/core';
