// NOTE(M1 vendoring): relative import — this file sits in Astro's config-loading
// closure, where the @sonder/* Vite aliases from astro.config.mjs are not applied.
import {
  getConfiguredPageModules,
  getResolvedPageModuleI18n,
  getPageModuleRoute,
  getResolvedPageModule,
  getResolvedPageModuleScaffolds,
  getResolvedPageModules,
  isPageModuleEnabled,
  normalizeModuleRoute,
  type SonderPageModuleRoute,
} from '../modules';
import type { SonderAstroPluginConfig, SonderConfig, SonderPluginContext } from './types';

export {
  getConfiguredPageModules,
  getResolvedPageModuleI18n,
  getPageModuleRoute,
  getResolvedPageModule,
  getResolvedPageModuleScaffolds,
  getResolvedPageModules,
  isPageModuleEnabled,
  normalizeModuleRoute,
} from '../modules';

const defaultPluginContext: SonderPluginContext = {
  mathRenderer: 'katex',
};

export function defineSonderConfig(config: SonderConfig): SonderConfig {
  return config;
}

function createPageModuleRoutesIntegration(
  config: SonderConfig,
): NonNullable<Required<SonderAstroPluginConfig>['integrations']>[number] {
  const modules = getResolvedPageModules(config);

  return {
    name: '@sonder/page-modules',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        for (const module of modules) {
          if (module.routes?.length) {
            for (const route of module.routes) {
              injectRoute({
                pattern: getModuleRoutePattern(route, module.route),
                entrypoint: route.entrypoint,
                prerender: route.prerender ?? true,
              });
            }
          }
        }
      },
    },
  };
}

function getModuleRoutePattern(route: SonderPageModuleRoute, moduleRoute: string): string {
  if (typeof route.pattern === 'function') {
    return route.pattern(moduleRoute);
  }

  return route.pattern ?? moduleRoute;
}

export function getAstroPluginConfig(
  config: SonderConfig,
  context: SonderPluginContext = defaultPluginContext,
): Required<SonderAstroPluginConfig> {
  const astroConfigs = (config.plugins ?? []).flatMap((plugin) => {
    if (plugin.enabled === false) return [];
    if (!plugin.astro) return [];

    return typeof plugin.astro === 'function' ? plugin.astro(context) : plugin.astro;
  });

  return {
    integrations: [
      createPageModuleRoutesIntegration(config),
      ...astroConfigs.flatMap((pluginConfig) => pluginConfig.integrations ?? []),
    ],
    remarkPlugins: astroConfigs.flatMap((pluginConfig) => pluginConfig.remarkPlugins ?? []),
    rehypePlugins: astroConfigs.flatMap((pluginConfig) => pluginConfig.rehypePlugins ?? []),
  };
}
