// @ts-check

import fs from 'node:fs';
import { unified } from '@astrojs/markdown-remark';
import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import expressiveCode, { defineEcConfig, setAlpha } from 'astro-expressive-code';
import { pluginCollapsible } from 'expressive-code-collapsible';
import { pluginLanguageBadge } from 'expressive-code-language-badge';
import { parse } from 'smol-toml';

import { getCodeCollapseLabels, paperCodeThemes } from './src/config/code-theme';
import { siteConfigSchema } from './src/config/schema';
import { resolveApplyProvider, resolveYoulinConfig } from './src/config/youlin';
import { getMarkdownConfig } from './src/plugins/markdown';

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const siteToml = parse(fs.readFileSync(new URL('./site.config.toml', import.meta.url), 'utf8'));
const parsedSiteConfig = siteConfigSchema.safeParse(
  isRecord(siteToml.config) ? siteToml.config : {},
);
if (!parsedSiteConfig.success) {
  const issues = parsedSiteConfig.error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid site.config.toml:\n${issues}`);
}
const siteConfig = parsedSiteConfig.data;

/**
 * @param {unknown} value
 */
const normalizeSiteUrl = (value) => {
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  return /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
const customSite = process.env.SITE_URL;
const customBase = process.env.SITE_BASE;
const repositoryOwner = process.env.GITHUB_REPOSITORY_OWNER;
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const isProjectPage =
  Boolean(repositoryOwner) &&
  Boolean(repositoryName) &&
  repositoryName !== `${repositoryOwner}.github.io`;

const githubPagesSite =
  repositoryOwner && repositoryName
    ? `https://${repositoryOwner}.github.io${isProjectPage ? `/${repositoryName}` : ''}`
    : undefined;

const resolvedSite =
  normalizeSiteUrl(customSite) ||
  (isGitHubActions && githubPagesSite ? githubPagesSite : undefined) ||
  normalizeSiteUrl(siteConfig.site.url) ||
  'https://example.com';

const resolvedBase =
  customBase || (isGitHubActions && isProjectPage && repositoryName ? `/${repositoryName}` : '/');

const code = siteConfig.code;
const youlin = resolveYoulinConfig(siteConfig.youlin);
const applyProvider = resolveApplyProvider(
  youlin.apply.provider,
  youlin.baseUrl,
  siteConfig.site.repository,
);
const markdown = getMarkdownConfig({
  ...siteConfig.markdown,
  metingApi: siteConfig.music.meting_api,
  lang: siteConfig.theme.lang,
  youlin,
  applyProvider,
  youlinBaseUrl: youlin.baseUrl,
  youlinApplyTurnstileSiteKey: youlin.apply.turnstileSiteKey,
  youlinApplyTimeoutMs: youlin.apply.timeoutMs,
});

const expressiveCodeConfig = defineEcConfig({
  plugins: [
    pluginLineNumbers(),
    pluginCollapsibleSections(),
    ...(code.languageBadge ? [pluginLanguageBadge()] : []),
    ...(code.collapseLines > 0
      ? [
          pluginCollapsible({
            lineThreshold: code.collapseLines,
            previewLines: code.previewLines,
            defaultCollapsed: true,
            ...getCodeCollapseLabels(siteConfig.theme.lang),
          }),
        ]
      : []),
  ],
  defaultLocale: siteConfig.theme.lang,
  themes: [paperCodeThemes.dark, paperCodeThemes.light],
  themeCssRoot: ':root',
  themeCssSelector: (theme) =>
    theme.type === 'dark' ? '[data-theme="dark"]' : '[data-theme="light"]',
  useDarkModeMediaQuery: false,
  removeUnusedThemes: true,
  defaultProps: {
    wrap: code.wrap,
    preserveIndent: code.preserveIndent,
    showLineNumbers: code.lineNumbers,
    collapseStyle: code.collapseStyle,
    overridesByLang: {
      shellsession: { showLineNumbers: false },
    },
  },
  frames: {
    extractFileNameFromCode: true,
  },
  styleOverrides: {
    borderRadius: '0.75rem',
    borderWidth: '1px',
    borderColor: 'var(--paper-line-strong)',
    uiFontFamily: 'var(--font-meta)',
    uiFontSize: '0.8rem',
    codeFontFamily: 'var(--font-code)',
    codeFontSize: '0.875rem',
    codeLineHeight: '1.5rem',
    codeForeground: 'var(--paper-ink)',
    codePaddingBlock: '1rem',
    codePaddingInline: '1.15rem',
    codeBackground: 'var(--paper-surface-muted)',
    // 行号对比度：EC 默认主题色在纸面上不足 WCAG AA（40% 灰）
    lineNumbers: {
      foreground: 'var(--paper-ink-faint)',
    },
    frames: {
      editorActiveTabBackground: 'var(--paper-surface-muted)',
      editorActiveTabIndicatorTopColor: 'var(--paper-accent)',
      editorTabBarBackground: 'var(--paper-control)',
      editorBackground: 'var(--paper-surface-muted)',
      frameBoxShadowCssValue: 'none',
      inlineButtonBackgroundActiveOpacity: '0.16',
      inlineButtonBackgroundHoverOrFocusOpacity: '0.1',
      terminalTitlebarBackground: 'var(--paper-control)',
      terminalBackground: 'var(--paper-surface-muted)',
      tooltipSuccessBackground: ({ theme }) =>
        setAlpha(theme.colors['terminal.ansiGreen'] || '#3f8f58', 0.94),
    },
    textMarkers: {
      lineMarkerAccentWidth: '0.2rem',
      backgroundOpacity: '0.24',
      borderOpacity: '0.62',
      markBackground: (context) =>
        context.theme.type === 'dark' ? 'rgba(120, 151, 255, 0.26)' : 'rgba(82, 111, 190, 0.14)',
      markBorderColor: (context) =>
        context.theme.type === 'dark' ? 'rgba(168, 188, 255, 0.74)' : 'rgba(82, 111, 190, 0.38)',
      insBackground: (context) =>
        context.theme.type === 'dark' ? 'rgba(82, 164, 112, 0.24)' : 'rgba(62, 138, 86, 0.13)',
      insBorderColor: (context) =>
        context.theme.type === 'dark' ? 'rgba(133, 205, 156, 0.68)' : 'rgba(62, 138, 86, 0.36)',
      delBackground: (context) =>
        context.theme.type === 'dark' ? 'rgba(207, 96, 86, 0.22)' : 'rgba(184, 74, 65, 0.12)',
      delBorderColor: (context) =>
        context.theme.type === 'dark' ? 'rgba(238, 147, 137, 0.64)' : 'rgba(184, 74, 65, 0.34)',
    },
    collapsibleSections: {
      closedBackgroundColor: 'var(--paper-control)',
    },
    languageBadge: {
      fontSize: '0.72rem',
      fontWeight: 'bold',
      borderRadius: '0.25rem',
      opacity: '1',
      borderWidth: '0px',
      borderColor: 'transparent',
    },
  },
});

// https://astro.build/config
export default defineConfig({
  site: resolvedSite,
  build: {
    inlineStylesheets: 'always',
  },
  base: resolvedBase,
  markdown: {
    processor: unified({
      remarkPlugins: markdown.remarkPlugins,
      rehypePlugins: markdown.rehypePlugins,
    }),
  },
  integrations: [...markdown.integrations, expressiveCode(expressiveCodeConfig), sitemap()],
});
