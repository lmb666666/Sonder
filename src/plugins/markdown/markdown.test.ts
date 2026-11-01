import { describe, expect, test } from 'bun:test';

import { getMarkdownConfig } from './markdown';

const baseOptions = { math: true, mathRenderer: 'katex' as const, mermaid: true };

/**
 * 样式由 MarkdownWidgets 以真实样式表加载（避免 FOUC），
 * 这里只验证：tabs 脚本仍然注入、指令始终装配、数学与 Mermaid 可关闭。
 */
describe('getMarkdownConfig', () => {
  test('注入标签页切换脚本', () => {
    const { integrations } = getMarkdownConfig(baseOptions);
    const tabsIntegration = integrations.find(
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
    const { integrations } = getMarkdownConfig(baseOptions);

    expect(
      integrations.some((integration) => integration.name === '@sonder/plugin-markdown/styles'),
    ).toBe(false);
  });

  test('提醒块、指令与响应式表格始终装配', () => {
    const { remarkPlugins, rehypePlugins } = getMarkdownConfig({
      math: false,
      mathRenderer: 'katex',
      mermaid: false,
    });

    expect(remarkPlugins).toHaveLength(3);
    expect(rehypePlugins).toHaveLength(1);
  });

  test('数学与 Mermaid 开关按配置装配', () => {
    const on = getMarkdownConfig(baseOptions);
    const off = getMarkdownConfig({ ...baseOptions, math: false, mermaid: false });

    expect(on.remarkPlugins).toHaveLength(5);
    expect(on.rehypePlugins).toHaveLength(2);
    expect(off.remarkPlugins).toHaveLength(3);
    expect(off.rehypePlugins).toHaveLength(1);
  });
});
