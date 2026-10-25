export type SonderPageModuleId = string;

export type SonderPageModuleBuiltinId = 'projects' | 'media';

export type SonderContentExtension = 'md' | 'mdx';

export interface SonderScaffoldTemplateContext {
  title: string;
  slug: string;
  isoDate: string;
  date: string;
}

export type SonderScaffoldTemplateVariable = 'title' | 'slug' | 'isoDate' | 'date';

export interface SonderPageModuleNav {
  label: string;
  href: string;
}

export interface SonderPageModuleScaffold {
  command: string;
  collection: string;
  directory: string;
  defaultExtension?: SonderContentExtension;
  template: URL;
}

export interface SonderPageModuleRoute {
  pattern?: string | ((moduleRoute: string) => string);
  entrypoint: URL;
  prerender?: boolean;
}

export interface SonderPageModule {
  id: SonderPageModuleId;
  enabled?: boolean;
  route: string;
  nav: SonderPageModuleNav;
  collections: string[];
  i18n?: SonderI18nContribution;
  scaffold?: SonderPageModuleScaffold;
  routes?: SonderPageModuleRoute[];
}

export interface SonderPageModuleOptions {
  enabled?: boolean;
  route?: string;
}

export interface ResolvedSonderPageModule extends SonderPageModule {
  enabled: true;
  route: string;
  nav: SonderPageModuleNav;
}

export interface SonderPagesPlugin {
  name: '@sonder/pages';
  enabled?: boolean;
}
import type { SonderI18nContribution } from '@sonder/core';
