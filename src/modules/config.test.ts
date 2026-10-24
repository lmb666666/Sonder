import { describe, expect, test } from 'bun:test';
import { mediaModule } from '@navfolio/page-media';
import { projectsModule } from '@navfolio/page-projects';
import { vibeModule } from '@navfolio/page-vibe';
import { getResolvedPageModuleScaffolds } from './config';

describe('getResolvedPageModuleScaffolds', () => {
  test('collects enabled module templates and applies extension defaults', async () => {
    const scaffolds = getResolvedPageModuleScaffolds({
      modules: [projectsModule(), vibeModule(), mediaModule()],
    });

    expect(scaffolds.map(({ command, defaultExtension }) => [command, defaultExtension])).toEqual([
      ['project', 'mdx'],
      ['vibe', 'md'],
      ['media', 'md'],
    ]);

    expect(
      await Promise.all(scaffolds.map((scaffold) => Bun.file(scaffold.template).exists())),
    ).toEqual([true, true, true]);
  });

  test('omits scaffolds from disabled modules', () => {
    const scaffolds = getResolvedPageModuleScaffolds({
      modules: [projectsModule(), vibeModule({ enabled: false })],
    });

    expect(scaffolds.map((scaffold) => scaffold.command)).toEqual(['project']);
  });

  test('rejects scaffold collections missing from the module contract', () => {
    expect(() =>
      getResolvedPageModuleScaffolds({
        modules: [
          {
            id: 'example',
            route: '/example',
            nav: {
              label: 'Example',
              href: '/example',
            },
            collections: [],
            scaffold: {
              command: 'example',
              collection: 'example',
              directory: 'src/content/example',
              template: new URL(import.meta.url),
            },
          },
        ],
      }),
    ).toThrow('must be declared in module.collections');
  });
});
