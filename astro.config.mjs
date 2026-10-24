// @ts-check

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import { parse } from 'smol-toml';

import tailwindcss from '@tailwindcss/vite';

import navfolioConfig from './navfolio.config';
import { getAstroPluginConfig } from './src/plugins/config';

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const siteToml = parse(fs.readFileSync(new URL('./src/config/site.toml', import.meta.url), 'utf8'));
const configToml = isRecord(siteToml.config) ? siteToml.config : {};
const siteConfig = isRecord(configToml.site) ? configToml.site : {};
const mathConfig = isRecord(configToml.math) ? configToml.math : {};
const configuredSiteUrl = siteConfig.url;
const configuredMathRenderer = mathConfig.render;
const mathRenderer = configuredMathRenderer === 'mathjax' ? 'mathjax' : 'katex';
const astroPluginConfig = getAstroPluginConfig(navfolioConfig, { mathRenderer });
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
  normalizeSiteUrl(configuredSiteUrl) ||
  'https://example.com';

const resolvedBase =
  customBase || (isGitHubActions && isProjectPage && repositoryName ? `/${repositoryName}` : '/');

// https://astro.build/config
export default defineConfig({
  site: resolvedSite,
  base: resolvedBase,
  markdown: {
    remarkPlugins: astroPluginConfig.remarkPlugins,
    rehypePlugins: astroPluginConfig.rehypePlugins,
  },
  integrations: [...astroPluginConfig.integrations, mdx(), sitemap()],

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: [
        // Vendored @navfolio/* packages (see VENDORED.md) — specifiers stay
        // unchanged, they resolve to in-repo source instead of node_modules.
        {
          find: /^@navfolio\/theme-default\/components\/(.*)$/,
          replacement: fileURLToPath(
            new URL('./src/components/theme/components/$1', import.meta.url),
          ),
        },
        {
          find: /^@navfolio\/theme-default\/styles\/(.*)$/,
          replacement: fileURLToPath(new URL('./src/components/theme/styles/$1', import.meta.url)),
        },
        {
          find: /^@navfolio\/theme-default$/,
          replacement: fileURLToPath(new URL('./src/components/theme/index.ts', import.meta.url)),
        },
        {
          find: /^@navfolio\/mdx-components\/(.*)$/,
          replacement: fileURLToPath(new URL('./src/components/mdx/$1', import.meta.url)),
        },
        {
          find: /^@navfolio\/plugin-markdown\/styles\.css$/,
          replacement: fileURLToPath(new URL('./src/plugins/markdown/styles.css', import.meta.url)),
        },
        {
          find: /^@navfolio\/plugin-markdown$/,
          replacement: fileURLToPath(new URL('./src/plugins/markdown/index.ts', import.meta.url)),
        },
        {
          find: /^@navfolio\/plugin-callout\/styles\.css$/,
          replacement: fileURLToPath(
            new URL('./src/plugins/markdown/callout/styles.css', import.meta.url),
          ),
        },
        {
          find: /^@navfolio\/plugin-callout$/,
          replacement: fileURLToPath(
            new URL('./src/plugins/markdown/callout/index.ts', import.meta.url),
          ),
        },
        {
          find: /^@navfolio\/plugin-markdown-layouts\/styles\.css$/,
          replacement: fileURLToPath(
            new URL('./src/plugins/markdown/layouts/styles.css', import.meta.url),
          ),
        },
        {
          find: /^@navfolio\/plugin-markdown-layouts$/,
          replacement: fileURLToPath(
            new URL('./src/plugins/markdown/layouts/index.ts', import.meta.url),
          ),
        },
        {
          find: /^@navfolio\/pages$/,
          replacement: fileURLToPath(new URL('./src/modules/index.ts', import.meta.url)),
        },
        {
          find: /^@navfolio\/page-projects$/,
          replacement: fileURLToPath(new URL('./src/modules/projects/index.ts', import.meta.url)),
        },
        {
          find: /^@navfolio\/page-vibe$/,
          replacement: fileURLToPath(new URL('./src/modules/vibe/index.ts', import.meta.url)),
        },
        {
          find: /^@navfolio\/page-media$/,
          replacement: fileURLToPath(new URL('./src/modules/media/index.ts', import.meta.url)),
        },
        {
          find: /^@navfolio\/core$/,
          replacement: fileURLToPath(new URL('./src/framework/index.ts', import.meta.url)),
        },
        {
          find: 'virtual:navfolio/page-runtime',
          replacement: fileURLToPath(new URL('./src/modules/page-runtime.ts', import.meta.url)),
        },
      ],
    },
  },
});
