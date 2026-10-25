import remarkCallouts from './remark-callouts.js';
import type { CalloutPluginOptions, SonderPlugin } from './types.js';

export function calloutPlugin(options: CalloutPluginOptions = {}): SonderPlugin {
  return {
    name: '@sonder/plugin-callout',
    enabled: options.enabled ?? true,
    astro: {
      remarkPlugins: [remarkCallouts],
    },
  };
}
