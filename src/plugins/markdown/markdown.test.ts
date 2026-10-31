import { describe, expect, test } from 'bun:test';

import { markdownPlugin } from './markdown';

/**
 * 样式不再由本插件注入（改由 MarkdownWidgets 以真实样式表加载，避免 FOUC），
 * 这里只验证：tabs 脚本仍然注入、且只在启用指令时注入。
 */
describe('markdownPlugin', () => {
  test('注入标签页切换脚本', () => {
    const plugin = markdownPlugin();
    const astroConfig =
      typeof plugin.astro === 'function' ? plugin.astro({ mathRenderer: 'katex' }) : plugin.astro;
    const tabsIntegration = astroConfig?.integrations?.find(
      (integration) => integration.name === '@sonder/plugin-markdown/tabs',
    );
    const injectedScripts: Array<{ stage: string; content: string }> = [];

    tabsIntegration?.hooks?.['astro:config:setup']?.({
      injectScript: (stage: string, content: string) => {
        injectedScripts.push({ stage, content });
      },
    } as never);

    expect(injectedScripts).toHaveLength(1);
    expect(injectedScripts[0]?.stage).toBe('head-inline');
    expect(injectedScripts[0]?.content).toContain('data-sd-tab-btn');
    expect(injectedScripts[0]?.content).toContain('data-sd-tab-panel');
    // 事件委托 + 单次绑定守卫，避免重复监听
    expect(injectedScripts[0]?.content).toContain('__sonderTabsBound');
  });

  test('不再注入样式脚本（避免首屏无样式闪烁）', () => {
    const plugin = markdownPlugin();
    const astroConfig =
      typeof plugin.astro === 'function' ? plugin.astro({ mathRenderer: 'katex' }) : plugin.astro;

    expect(
      astroConfig?.integrations?.some(
        (integration) => integration.name === '@sonder/plugin-markdown/styles',
      ),
    ).toBe(false);
  });

  test('禁用指令时不注入标签页脚本', () => {
    const plugin = markdownPlugin({ callouts: false, directives: false });
    const astroConfig =
      typeof plugin.astro === 'function' ? plugin.astro({ mathRenderer: 'katex' }) : plugin.astro;

    expect(
      astroConfig?.integrations?.some(
        (integration) => integration.name === '@sonder/plugin-markdown/tabs',
      ),
    ).toBe(false);
  });

  test('markdown 插件链按配置装配', () => {
    const plugin = markdownPlugin({ math: false, mermaid: false });
    const astroConfig =
      typeof plugin.astro === 'function' ? plugin.astro({ mathRenderer: 'katex' }) : plugin.astro;

    const remarkNames = (astroConfig?.remarkPlugins ?? []).map(
      (entry) => (Array.isArray(entry) ? entry[0] : entry)?.name ?? String(entry?.name),
    );
    // remark-directive 与 Sonder 指令工厂始终存在
    expect(remarkNames.length).toBeGreaterThanOrEqual(2);
    expect(astroConfig?.rehypePlugins?.some((entry) => entry === undefined)).toBe(false);
  });
});
