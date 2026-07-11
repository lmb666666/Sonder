import type { NavfolioAstroPluginConfig, NavfolioConfig, NavfolioPluginContext } from './types';

const defaultPluginContext: NavfolioPluginContext = {
  mathRenderer: 'katex',
};

export function defineNavfolioConfig(config: NavfolioConfig): NavfolioConfig {
  return config;
}

export function getAstroPluginConfig(
  config: NavfolioConfig,
  context: NavfolioPluginContext = defaultPluginContext,
): Required<NavfolioAstroPluginConfig> {
  const astroConfigs = (config.plugins ?? []).flatMap((plugin) => {
    if (plugin.enabled === false) return [];
    if (!plugin.astro) return [];

    return typeof plugin.astro === 'function' ? plugin.astro(context) : plugin.astro;
  });

  return {
    integrations: astroConfigs.flatMap((pluginConfig) => pluginConfig.integrations ?? []),
    remarkPlugins: astroConfigs.flatMap((pluginConfig) => pluginConfig.remarkPlugins ?? []),
    rehypePlugins: astroConfigs.flatMap((pluginConfig) => pluginConfig.rehypePlugins ?? []),
  };
}
