export { projectsModule } from './projects/index.js';
export { mediaModule } from './media/index.js';
export { vibeModule } from './vibe/index.js';
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
  NavfolioContentExtension,
  NavfolioPageModule,
  NavfolioPageModuleBuiltinId,
  NavfolioPageModuleId,
  NavfolioPageModuleNav,
  NavfolioPageModuleOptions,
  NavfolioPageModuleRoute,
  NavfolioPageModuleScaffold,
  NavfolioPagesPlugin,
  NavfolioScaffoldTemplateContext,
  NavfolioScaffoldTemplateVariable,
  ResolvedNavfolioPageModule,
} from './types';
