import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import remarkCallouts from './callout/index.js';
import remarkLayouts from './layouts/index.js';
import type { AstroIntegration } from 'astro';
import expressiveCode from 'astro-expressive-code';
import rehypeKatex from 'rehype-katex';
import rehypeMathjax from 'rehype-mathjax';
import remarkMath from 'remark-math';

import { resolveMarkdownOptions, type MarkdownPluginOptions } from './markdown-options.js';
import rehypeResponsiveTables from './rehype-responsive-tables.js';
import remarkMermaid from './remark-mermaid.js';
import type { SonderPlugin } from './types.js';

function loadMarkdownStyles(options: { callouts: boolean; layouts: boolean }): string {
  const stylePaths = [
    ...(options.callouts ? [fileURLToPath(new URL('./callout/styles.css', import.meta.url))] : []),
    ...(options.layouts ? [fileURLToPath(new URL('./layouts/styles.css', import.meta.url))] : []),
  ];

  return stylePaths.map((stylePath) => readFileSync(stylePath, 'utf8')).join('\n');
}

function markdownStylesIntegration(options: {
  callouts: boolean;
  layouts: boolean;
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
          ...(resolvedOptions.callouts || resolvedOptions.layouts
            ? [markdownStylesIntegration(resolvedOptions)]
            : []),
          ...(resolvedOptions.expressiveCode ? [expressiveCode()] : []),
        ],
        remarkPlugins: [
          ...(resolvedOptions.callouts ? [remarkCallouts] : []),
          ...(resolvedOptions.layouts ? [remarkLayouts] : []),
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
