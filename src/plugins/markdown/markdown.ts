import remarkDirective from 'remark-directive';
import remarkCallouts from './callout/index.js';
import remarkSonderDirectives from './directives/index.js';
import type { AstroIntegration } from 'astro';
import expressiveCode from 'astro-expressive-code';
import rehypeKatex from 'rehype-katex';
import rehypeMathjax from 'rehype-mathjax';
import remarkMath from 'remark-math';

import { resolveMarkdownOptions, type MarkdownPluginOptions } from './markdown-options.js';
import rehypeResponsiveTables from './rehype-responsive-tables.js';
import remarkMermaid from './remark-mermaid.js';
import type { SonderPlugin } from './types.js';

/**
 * 标签页切换脚本。
 * 提醒块与指令的样式不再由这里注入——改由 MarkdownWidgets 以真实样式表加载，
 * 避免首屏无样式闪烁，也保证禁用 JS 时样式依然存在。
 */
function markdownTabsIntegration(): AstroIntegration {
  return {
    name: '@sonder/plugin-markdown/tabs',
    hooks: {
      'astro:config:setup': ({ injectScript }) => {
        // 事件委托，文档级单次绑定即可覆盖全部实例
        injectScript(
          'head-inline',
          `
(function () {
  if (window.__sonderTabsBound) return;
  window.__sonderTabsBound = true;
  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-sd-tab-btn]') : null;
    if (!button) return;
    const root = button.closest('[data-sd-tabs]');
    if (!root) return;
    const index = button.getAttribute('data-sd-tab-btn');
    root.querySelectorAll('[data-sd-tab-btn]').forEach((item) => {
      const active = item.getAttribute('data-sd-tab-btn') === index;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    root.querySelectorAll('[data-sd-tab-panel]').forEach((panel) => {
      const active = panel.getAttribute('data-sd-tab-panel') === index;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });
  });
})();
`,
        );
      },
    },
  };
}

export function markdownPlugin(options: MarkdownPluginOptions = {}): SonderPlugin {
  const initialOptions = resolveMarkdownOptions(options);

  return {
    name: '@sonder/plugin-markdown',
    enabled: initialOptions.enabled,
    astro: ({ mathRenderer }) => {
      const resolvedOptions = resolveMarkdownOptions(options, { mathRenderer });

      return {
        integrations: [
          ...(resolvedOptions.directives ? [markdownTabsIntegration()] : []),
          ...(resolvedOptions.expressiveCode ? [expressiveCode()] : []),
        ],
        remarkPlugins: [
          ...(resolvedOptions.callouts ? [remarkCallouts] : []),
          ...(resolvedOptions.directives
            ? [remarkDirective, () => remarkSonderDirectives({ layouts: resolvedOptions.layouts })]
            : []),
          ...(resolvedOptions.math.enabled ? [remarkMath] : []),
          ...(resolvedOptions.mermaid ? [remarkMermaid] : []),
        ],
        rehypePlugins: [
          ...(resolvedOptions.math.enabled
            ? [resolvedOptions.math.renderer === 'mathjax' ? rehypeMathjax : rehypeKatex]
            : []),
          ...(resolvedOptions.responsiveTables ? [rehypeResponsiveTables] : []),
        ],
      };
    },
  };
}
