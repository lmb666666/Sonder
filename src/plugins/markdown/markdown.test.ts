import { describe, expect, test } from 'bun:test';

import { markdownPlugin } from './markdown';

describe('markdownPlugin', () => {
  test('injects markdown styles when callouts are enabled', () => {
    const plugin = markdownPlugin();
    const astroConfig =
      typeof plugin.astro === 'function' ? plugin.astro({ mathRenderer: 'katex' }) : plugin.astro;

    expect(
      astroConfig?.integrations?.some(
        (integration) => integration.name === '@navfolio/plugin-markdown/styles',
      ),
    ).toBe(true);
  });

  test('inlines callout and layout styles in the document head', () => {
    const plugin = markdownPlugin();
    const astroConfig =
      typeof plugin.astro === 'function' ? plugin.astro({ mathRenderer: 'katex' }) : plugin.astro;
    const stylesIntegration = astroConfig?.integrations?.find(
      (integration) => integration.name === '@navfolio/plugin-markdown/styles',
    );
    const injectedScripts: Array<{ stage: string; content: string }> = [];

    stylesIntegration?.hooks?.['astro:config:setup']?.({
      injectScript: (stage: string, content: string) => {
        injectedScripts.push({ stage, content });
      },
    } as never);

    expect(injectedScripts).toHaveLength(1);
    expect(injectedScripts[0]?.stage).toBe('head-inline');
    expect(injectedScripts[0]?.content).toContain('.callout');
    expect(injectedScripts[0]?.content).toContain('.markdown-columns');
    expect(injectedScripts[0]?.content).toContain('data-astro-transition-persist');
    expect(injectedScripts[0]?.content).toContain('astro:after-swap');
    expect(injectedScripts[0]?.content).not.toContain('?inline');
  });

  test('keeps layout styles when callouts are disabled', () => {
    const plugin = markdownPlugin({ callouts: false });
    const astroConfig =
      typeof plugin.astro === 'function' ? plugin.astro({ mathRenderer: 'katex' }) : plugin.astro;

    expect(
      astroConfig?.integrations?.some(
        (integration) => integration.name === '@navfolio/plugin-markdown/styles',
      ),
    ).toBe(true);
  });

  test('does not inject markdown styles when callouts and layouts are disabled', () => {
    const plugin = markdownPlugin({ callouts: false, layouts: false });
    const astroConfig =
      typeof plugin.astro === 'function' ? plugin.astro({ mathRenderer: 'katex' }) : plugin.astro;

    expect(
      astroConfig?.integrations?.some(
        (integration) => integration.name === '@navfolio/plugin-markdown/styles',
      ),
    ).toBe(false);
  });
});
