import { describe, expect, test } from 'bun:test';

import { markdownPlugin } from './markdown';

describe('markdownPlugin', () => {
  test('injects markdown styles when callouts are enabled', () => {
    const plugin = markdownPlugin();
    const astroConfig =
      typeof plugin.astro === 'function' ? plugin.astro({ mathRenderer: 'katex' }) : plugin.astro;

    expect(
      astroConfig?.integrations?.some(
        (integration) => integration.name === '@sonder/plugin-markdown/styles',
      ),
    ).toBe(true);
  });

  test('inlines callout and directive styles in the document head', () => {
    const plugin = markdownPlugin();
    const astroConfig =
      typeof plugin.astro === 'function' ? plugin.astro({ mathRenderer: 'katex' }) : plugin.astro;
    const stylesIntegration = astroConfig?.integrations?.find(
      (integration) => integration.name === '@sonder/plugin-markdown/styles',
    );
    const injectedScripts: Array<{ stage: string; content: string }> = [];

    stylesIntegration?.hooks?.['astro:config:setup']?.({
      injectScript: (stage: string, content: string) => {
        injectedScripts.push({ stage, content });
      },
    } as never);

    expect(injectedScripts).toHaveLength(2);
    expect(injectedScripts.every((script) => script.stage === 'head-inline')).toBe(true);

    const [styles, tabScript] = injectedScripts;
    expect(styles?.content).toContain('.callout');
    expect(styles?.content).toContain('.markdown-columns');
    expect(styles?.content).toContain('.sd-badge');
    expect(styles?.content).toContain('data-astro-transition-persist');
    expect(styles?.content).toContain('astro:after-swap');
    expect(styles?.content).not.toContain('?inline');

    expect(tabScript?.content).toContain('data-sd-tab-btn');
    expect(tabScript?.content).toContain('data-sd-tab-panel');
  });

  test('keeps directive styles when callouts are disabled', () => {
    const plugin = markdownPlugin({ callouts: false });
    const astroConfig =
      typeof plugin.astro === 'function' ? plugin.astro({ mathRenderer: 'katex' }) : plugin.astro;

    expect(
      astroConfig?.integrations?.some(
        (integration) => integration.name === '@sonder/plugin-markdown/styles',
      ),
    ).toBe(true);
  });

  test('does not inject markdown styles when callouts and directives are disabled', () => {
    const plugin = markdownPlugin({ callouts: false, directives: false });
    const astroConfig =
      typeof plugin.astro === 'function' ? plugin.astro({ mathRenderer: 'katex' }) : plugin.astro;

    expect(
      astroConfig?.integrations?.some(
        (integration) => integration.name === '@sonder/plugin-markdown/styles',
      ),
    ).toBe(false);
  });
});
