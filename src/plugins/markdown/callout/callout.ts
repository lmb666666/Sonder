import remarkCallouts from './remark-callouts.js';
import type { CalloutPluginOptions, NavfolioPlugin } from './types.js';

export function calloutPlugin(options: CalloutPluginOptions = {}): NavfolioPlugin {
  return {
    name: '@navfolio/plugin-callout',
    enabled: options.enabled ?? true,
    astro: {
      remarkPlugins: [remarkCallouts],
    },
  };
}
