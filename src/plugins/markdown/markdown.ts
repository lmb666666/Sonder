import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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

function loadMarkdownStyles(options: { callouts: boolean; directives: boolean }): string {
  const stylePaths = [
    ...(options.callouts ? [fileURLToPath(new URL('./callout/styles.css', import.meta.url))] : []),
    ...(options.directives
      ? [fileURLToPath(new URL('./directives/styles.css', import.meta.url))]
      : []),
  ];

  return stylePaths.map((stylePath) => readFileSync(stylePath, 'utf8')).join('\n');
}

function markdownStylesIntegration(options: {
  callouts: boolean;
  directives: boolean;
}): AstroIntegration {
  return {
    name: '@sonder/plugin-markdown/styles',
    hooks: {
      'astro:config:setup': ({ injectScript }) => {
        const styles = loadMarkdownStyles(options);

        injectScript(
          'head-inline',
          `
const styleId = 'sonder-markdown-styles';
const persistId = 'sonder-markdown-styles';
const styles = ${JSON.stringify(styles)};

function ensureMarkdownStyles() {
  if (document.getElementById(styleId)) {
    return;
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.setAttribute('data-astro-transition-persist', persistId);
  style.textContent = styles;
  document.head.append(style);
}

ensureMarkdownStyles();
document.addEventListener('astro:after-swap', ensureMarkdownStyles);
`,
        );

        if (options.directives) {
          // 标签页切换：事件委托，文档级单次绑定即可覆盖全部实例
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
        }
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
          ...(resolvedOptions.callouts || resolvedOptions.directives
            ? [markdownStylesIntegration(resolvedOptions)]
            : []),
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
