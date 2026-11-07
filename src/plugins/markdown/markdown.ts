import type { RehypePlugins, RemarkPlugins } from '@astrojs/markdown-remark';
import type { AstroIntegration } from 'astro';
import rehypeKatex from 'rehype-katex';
import rehypeMathjax from 'rehype-mathjax';
import remarkDirective from 'remark-directive';
import remarkMath from 'remark-math';
import remarkCallouts from './callout/index.js';
import remarkSonderDirectives from './directives/index.js';
import rehypeResponsiveTables from './rehype-responsive-tables.js';
import remarkMermaid from './remark-mermaid.js';
import type { MathRenderer } from './types.js';
import type { ApplyProvider, ResolvedYoulinConfig } from '../../config/youlin.js';

export interface MarkdownConfigOptions {
  math: boolean;
  mathRenderer: MathRenderer;
  mermaid: boolean;
  metingApi?: string;
  lang?: string;
  youlin?: ResolvedYoulinConfig;
  applyProvider?: ApplyProvider;
  youlinBaseUrl?: string;
  youlinApplyTurnstileSiteKey?: string;
  youlinApplyTimeoutMs?: number;
}

export interface MarkdownConfig {
  integrations: AstroIntegration[];
  remarkPlugins: RemarkPlugins;
  rehypePlugins: RehypePlugins;
}

/**
 * 标签页切换脚本。
 * 提醒块与指令的样式由 MarkdownWidgets 以真实样式表加载，
 * 避免首屏无样式闪烁，也保证禁用 JS 时样式依然存在。
 */
function markdownTabsIntegration(): AstroIntegration {
  return {
    name: 'sonder/markdown-tabs',
    hooks: {
      'astro:config:setup': ({ injectScript }) => {
        // 事件委托，文档级单次绑定即可覆盖全部实例
        injectScript(
          'head-inline',
          `
(function () {
  if (window.__sonderTabsBound) return;
  window.__sonderTabsBound = true;
  document.documentElement.classList.add('js');
  const syncTabs = () => {
    document.querySelectorAll('[data-sd-tabs]').forEach((root) => {
      const active =
        root.querySelector('[data-sd-tab-btn].is-active')?.getAttribute('data-sd-tab-btn') ?? '0';
      root.querySelectorAll('[data-sd-tab-panel]').forEach((panel) => {
        panel.hidden = panel.getAttribute('data-sd-tab-panel') !== active;
      });
    });
  };
  document.addEventListener('astro:page-load', syncTabs);
  syncTabs();
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
  document.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const button = event.target instanceof Element ? event.target.closest('[data-sd-tab-btn]') : null;
    if (!button) return;
    const root = button.closest('[data-sd-tabs]');
    if (!root) return;
    const buttons = Array.from(root.querySelectorAll('[data-sd-tab-btn]'));
    const index = buttons.indexOf(button);
    if (index === -1 || buttons.length === 0) return;
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    event.preventDefault();
    buttons[nextIndex].focus();
    buttons[nextIndex].click();
  });
})();
`,
        );
      },
    },
  };
}

/**
 * 文章 Markdown 管线。
 * 提醒块、外挂指令、响应式表格始终开启（文章内容依赖它们）；
 * 数学与 Mermaid 由 site.config.toml 的 [config.markdown] 控制。
 */
export function getMarkdownConfig({
  math,
  mathRenderer,
  mermaid,
  metingApi = '',
  lang,
  youlin,
  applyProvider,
  youlinBaseUrl,
  youlinApplyTurnstileSiteKey,
  youlinApplyTimeoutMs,
}: MarkdownConfigOptions): MarkdownConfig {
  return {
    integrations: [markdownTabsIntegration()],
    remarkPlugins: [
      remarkCallouts,
      remarkDirective,
      () =>
        remarkSonderDirectives({
          layouts: true,
          metingApi,
          lang,
          youlin,
          applyProvider,
          youlinBaseUrl,
          youlinApplyTurnstileSiteKey,
          youlinApplyTimeoutMs,
        }),
      ...(math ? [remarkMath] : []),
      ...(mermaid ? [remarkMermaid] : []),
    ] as MarkdownConfig['remarkPlugins'],
    rehypePlugins: [
      ...(math ? [mathRenderer === 'mathjax' ? rehypeMathjax : rehypeKatex] : []),
      rehypeResponsiveTables,
    ] as MarkdownConfig['rehypePlugins'],
  };
}
