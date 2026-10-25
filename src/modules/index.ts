export { mediaModule } from './media/index.js';
export {
  defaultPageModules,
  getConfiguredPageModules,
  getPageModuleRoute,
  getResolvedPageModule,
  getResolvedPageModuleScaffolds,
  getResolvedPageModuleI18n,
  getResolvedPageModules,
  isPageModuleEnabled,
  normalizeModuleRoute,
} from './config.js';
export { pages } from './plugin.js';
export { renderScaffoldTemplate } from './scaffold.js';
export type {
  SonderContentExtension,
  SonderPageModule,
  SonderPageModuleBuiltinId,
  SonderPageModuleId,
  SonderPageModuleNav,
  SonderPageModuleOptions,
  SonderPageModuleRoute,
  SonderPageModuleScaffold,
  SonderPagesPlugin,
  SonderScaffoldTemplateContext,
  SonderScaffoldTemplateVariable,
  ResolvedSonderPageModule,
} from './types';
