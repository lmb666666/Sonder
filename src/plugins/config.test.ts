import { describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { mediaModule, projectsModule } from '@sonder/pages';

import {
  defineSonderConfig,
  getAstroPluginConfig,
  getPageModuleRoute,
  getResolvedPageModuleScaffolds,
  getResolvedPageModules,
  isPageModuleEnabled,
  normalizeModuleRoute,
} from './config';
import type { SonderPlugin } from './types';

describe('sonder plugin config', () => {
  test('collects astro markdown plugins and integrations from enabled plugins', () => {
    const remarkPlugin = () => undefined;
    const rehypePlugin = () => undefined;
    const integration = { name: 'demo-integration', hooks: {} };
    const plugin: SonderPlugin = {
      name: 'demo',
      astro: {
        integrations: [integration],
        remarkPlugins: [remarkPlugin],
        rehypePlugins: [rehypePlugin],
      },
    };

    const config = defineSonderConfig({ plugins: [plugin] });
    const astro = getAstroPluginConfig(config);

    expect(astro.integrations).toContainEqual(integration);
    expect(astro.integrations.some((item) => item.name === '@sonder/page-modules')).toBe(true);
    expect(astro.remarkPlugins).toEqual([remarkPlugin]);
    expect(astro.rehypePlugins).toEqual([rehypePlugin]);
  });

  test('skips disabled plugins', () => {
    const remarkPlugin = () => undefined;
    const plugin: SonderPlugin = {
      name: 'disabled-demo',
      enabled: false,
      astro: {
        remarkPlugins: [remarkPlugin],
      },
    };

    const config = defineSonderConfig({ plugins: [plugin] });
    const astro = getAstroPluginConfig(config);

    expect(astro.remarkPlugins).toEqual([]);
  });

  test('keeps optional page modules out of protocol defaults', () => {
    const config = defineSonderConfig({});
    const modules = getResolvedPageModules(config);

    expect(modules.map((module) => module.id)).toEqual(['projects']);
    expect(getPageModuleRoute(config, 'projects')).toBe('/projects');
    expect(isPageModuleEnabled(config, 'media')).toBe(false);
  });

  test('normalizes page module routes', () => {
    expect(normalizeModuleRoute('work')).toBe('/work');
    expect(normalizeModuleRoute('/space/')).toBe('/space');
  });

  test('supports disabled page modules', () => {
    const config = defineSonderConfig({
      modules: [projectsModule(), mediaModule({ enabled: false })],
    });

    expect(isPageModuleEnabled(config, 'projects')).toBe(true);
    expect(isPageModuleEnabled(config, 'media')).toBe(false);
    expect(getResolvedPageModules(config).map((module) => module.id)).toEqual(['projects']);
  });

  test('supports custom page module routes', () => {
    const config = defineSonderConfig({
      modules: [projectsModule({ route: '/work' }), mediaModule({ route: '/shelf' })],
    });

    expect(getPageModuleRoute(config, 'projects')).toBe('/work');
    expect(getPageModuleRoute(config, 'media')).toBe('/shelf');
    expect(getResolvedPageModules(config)[1].routes?.[0]?.entrypoint?.pathname).toContain(
      '/src/modules/media/routes/media.astro',
    );
  });

  test('rejects duplicate page module routes', () => {
    const config = defineSonderConfig({
      modules: [projectsModule({ route: '/space' }), mediaModule({ route: '/space' })],
    });

    expect(() => getResolvedPageModules(config)).toThrow('Duplicate Sonder page module route');
  });

  test('resolves scaffold metadata and templates from enabled page modules', () => {
    const config = defineSonderConfig({
      modules: [projectsModule(), mediaModule({ enabled: false })],
    });

    const [scaffold] = getResolvedPageModuleScaffolds(config);
    if (!scaffold) throw new Error('Expected the Projects scaffold.');

    expect({
      moduleId: scaffold.moduleId,
      command: scaffold.command,
      collection: scaffold.collection,
      directory: scaffold.directory,
      defaultExtension: scaffold.defaultExtension,
    }).toEqual({
      moduleId: 'projects',
      command: 'project',
      collection: 'projects',
      directory: 'src/content/projects',
      defaultExtension: 'mdx',
    });
    expect(scaffold.template instanceof URL).toBe(true);
    expect(existsSync(scaffold.template)).toBe(true);
  });
});
