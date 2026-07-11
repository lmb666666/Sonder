import { describe, expect, test } from 'bun:test';

import { defineNavfolioConfig, getAstroPluginConfig } from './config';
import type { NavfolioPlugin } from './types';

describe('navfolio plugin config', () => {
  test('collects astro markdown plugins and integrations from enabled plugins', () => {
    const remarkPlugin = () => undefined;
    const rehypePlugin = () => undefined;
    const integration = { name: 'demo-integration', hooks: {} };
    const plugin: NavfolioPlugin = {
      name: 'demo',
      astro: {
        integrations: [integration],
        remarkPlugins: [remarkPlugin],
        rehypePlugins: [rehypePlugin],
      },
    };

    const config = defineNavfolioConfig({ plugins: [plugin] });
    const astro = getAstroPluginConfig(config);

    expect(astro.integrations).toEqual([integration]);
    expect(astro.remarkPlugins).toEqual([remarkPlugin]);
    expect(astro.rehypePlugins).toEqual([rehypePlugin]);
  });

  test('skips disabled plugins', () => {
    const remarkPlugin = () => undefined;
    const plugin: NavfolioPlugin = {
      name: 'disabled-demo',
      enabled: false,
      astro: {
        remarkPlugins: [remarkPlugin],
      },
    };

    const config = defineNavfolioConfig({ plugins: [plugin] });
    const astro = getAstroPluginConfig(config);

    expect(astro.remarkPlugins).toEqual([]);
  });
});
