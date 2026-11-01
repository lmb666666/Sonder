// @ts-check

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { unified } from '@astrojs/markdown-remark';
import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import expressiveCode, { setAlpha } from 'astro-expressive-code';
import { parse } from 'smol-toml';

import { siteConfigSchema } from './src/config/schema';
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
const isDarkCodeTheme = ({ theme }) => theme.name === code.darkTheme;

const markdown = getMarkdownConfig(siteConfig.markdown);

const expressiveCodeConfig = {
  plugins: [pluginLineNumbers(), pluginCollapsibleSections()],
  defaultLocale: 'zh-CN',
  themes: [code.lightTheme, code.darkTheme],
  themeCssRoot: ':root',
  themeCssSelector: (theme) =>
    theme.name === code.darkTheme ? '[data-theme="dark"]' : '[data-theme="light"]',
  useDarkModeMediaQuery: false,
  removeUnusedThemes: true,
  defaultProps: {
    wrap: code.wrap,
    preserveIndent: code.preserveIndent,
    showLineNumbers: code.lineNumbers,
    collapseStyle: code.collapseStyle,
  },
  frames: {
    extractFileNameFromCode: true,
  },
  styleOverrides: {
    borderRadius: '1px',
    borderWidth: '1px',
    borderColor: 'var(--paper-line-strong)',
    uiFontFamily: 'var(--font-meta)',
    uiFontSize: '0.88rem',
    codeFontFamily: 'var(--font-code)',
    codeFontSize: '0.9rem',
    codeLineHeight: '1.65',
    codePaddingBlock: '1rem',
    codePaddingInline: '1.15rem',
    codeBackground: 'var(--paper-surface-muted)',
    // 行号对比度：EC 默认主题色在纸面上不足 WCAG AA（40% 灰）
    lineNumbers: {
      foreground: 'var(--paper-ink-faint)',
    },
    frames: {
      gutterForeground: 'var(--paper-ink-faint)',
      editorActiveTabBackground: 'var(--paper-surface-muted)',
      editorActiveTabIndicatorTopColor: 'var(--paper-accent)',
      editorTabBarBackground: 'var(--paper-control)',
      editorBackground: 'var(--paper-surface-muted)',
      frameBoxShadowCssValue: 'var(--paper-shadow)',
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
        isDarkCodeTheme(context) ? 'rgba(120, 151, 255, 0.26)' : 'rgba(82, 111, 190, 0.14)',
      markBorderColor: (context) =>
        isDarkCodeTheme(context) ? 'rgba(168, 188, 255, 0.74)' : 'rgba(82, 111, 190, 0.38)',
      insBackground: (context) =>
        isDarkCodeTheme(context) ? 'rgba(82, 164, 112, 0.24)' : 'rgba(62, 138, 86, 0.13)',
      insBorderColor: (context) =>
        isDarkCodeTheme(context) ? 'rgba(133, 205, 156, 0.68)' : 'rgba(62, 138, 86, 0.36)',
      delBackground: (context) =>
        isDarkCodeTheme(context) ? 'rgba(207, 96, 86, 0.22)' : 'rgba(184, 74, 65, 0.12)',
      delBorderColor: (context) =>
        isDarkCodeTheme(context) ? 'rgba(238, 147, 137, 0.64)' : 'rgba(184, 74, 65, 0.34)',
    },
    collapsibleSections: {
      closedBackgroundColor: 'var(--paper-control)',
    },
  },
};

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

  vite: {
    resolve: {
      alias: [
        // Vendored @sonder/* packages — specifiers stay
        // unchanged, they resolve to in-repo source instead of node_modules.
        {
          find: /^@sonder\/theme-default\/components\/(.*)$/,
          replacement: fileURLToPath(
            new URL('./src/components/theme/components/$1', import.meta.url),
          ),
        },
        {
          find: /^@sonder\/theme-default\/styles\/(.*)$/,
          replacement: fileURLToPath(new URL('./src/components/theme/styles/$1', import.meta.url)),
        },
        {
          find: /^@sonder\/theme-default$/,
          replacement: fileURLToPath(new URL('./src/components/theme/index.ts', import.meta.url)),
        },
        {
          find: /^@sonder\/mdx-components\/(.*)$/,
          replacement: fileURLToPath(new URL('./src/components/mdx/$1', import.meta.url)),
        },
      ],
    },
  },
});
