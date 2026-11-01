// @ts-check

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import { parse } from 'smol-toml';

import sonderConfig from './sonder.config';
import { siteConfigSchema } from './src/config/schema';
import { getAstroPluginConfig } from './src/plugins/config';

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
const siteConfigData = parsedSiteConfig.data;
const configuredSiteUrl = siteConfigData.site.url;
const mathRenderer = siteConfigData.markdown.mathRenderer;
const astroPluginConfig = getAstroPluginConfig(sonderConfig, { mathRenderer });
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
  build: {
    inlineStylesheets: 'always',
  },
  base: resolvedBase,
  markdown: {
    remarkPlugins: astroPluginConfig.remarkPlugins,
    rehypePlugins: astroPluginConfig.rehypePlugins,
  },
  integrations: [...astroPluginConfig.integrations, mdx(), sitemap()],

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
        {
          find: /^@sonder\/plugin-markdown\/styles\.css$/,
          replacement: fileURLToPath(new URL('./src/plugins/markdown/styles.css', import.meta.url)),
        },
        {
          find: /^@sonder\/plugin-markdown$/,
          replacement: fileURLToPath(new URL('./src/plugins/markdown/index.ts', import.meta.url)),
        },
        {
          find: /^@sonder\/plugin-callout\/styles\.css$/,
          replacement: fileURLToPath(
            new URL('./src/plugins/markdown/callout/styles.css', import.meta.url),
          ),
        },
        {
          find: /^@sonder\/plugin-callout$/,
          replacement: fileURLToPath(
            new URL('./src/plugins/markdown/callout/index.ts', import.meta.url),
          ),
        },
        {
          find: /^@sonder\/plugin-markdown-directives\/styles\.css$/,
          replacement: fileURLToPath(
            new URL('./src/plugins/markdown/directives/styles.css', import.meta.url),
          ),
        },
        {
          find: /^@sonder\/plugin-markdown-directives$/,
          replacement: fileURLToPath(
            new URL('./src/plugins/markdown/directives/index.ts', import.meta.url),
          ),
        },
        {
          find: /^@sonder\/pages$/,
          replacement: fileURLToPath(new URL('./src/modules/index.ts', import.meta.url)),
        },
        {
          find: /^@sonder\/page-media$/,
          replacement: fileURLToPath(new URL('./src/modules/media/index.ts', import.meta.url)),
        },
        {
          find: /^@sonder\/core$/,
          replacement: fileURLToPath(new URL('./src/framework/index.ts', import.meta.url)),
        },
        {
          find: 'virtual:sonder/page-runtime',
          replacement: fileURLToPath(new URL('./src/modules/page-runtime.ts', import.meta.url)),
        },
      ],
    },
  },
});
