import type { SiteConfig } from '../data/site';

export type CommentProvider = SiteConfig['comments']['provider'];
export type CommentsConfig = SiteConfig['comments'];

const giscusRequiredFields = ['repo', 'repo_id', 'category', 'category_id'] as const;
const commentProviders = ['giscus', 'utterances', 'waline', 'none'] as const;

function envValue(key: string) {
  return import.meta.env[key]?.trim() ?? '';
}

function envBoolean(key: string) {
  const value = envValue(key).toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(value)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(value)) {
    return false;
  }

  return undefined;
}

function envProvider(key: string): CommentProvider | undefined {
  const value = envValue(key);

  return commentProviders.includes(value as CommentProvider)
    ? (value as CommentProvider)
    : undefined;
}

function withEnvString<T extends Record<string, unknown>, K extends keyof T>(
  config: T,
  key: K,
  envKey: string,
) {
  const value = envValue(envKey);

  return value ? { ...config, [key]: value } : config;
}

export function resolveCommentsConfig(config: CommentsConfig): CommentsConfig {
  const enabled = envBoolean('NAVFOLIO_COMMENTS_ENABLED') ?? config.enabled;
  const provider = envProvider('NAVFOLIO_COMMENTS_PROVIDER') ?? config.provider;
  let giscus = withEnvString(config.giscus, 'repo', 'NAVFOLIO_GISCUS_REPO');
  giscus = withEnvString(giscus, 'repo_id', 'NAVFOLIO_GISCUS_REPO_ID');
  giscus = withEnvString(giscus, 'category', 'NAVFOLIO_GISCUS_CATEGORY');
  giscus = withEnvString(giscus, 'category_id', 'NAVFOLIO_GISCUS_CATEGORY_ID');

  return {
    ...config,
    enabled,
    provider,
    giscus,
  };
}

export function warnMissingCommentConfig(provider: CommentProvider, fields: string[]) {
  if (!import.meta.env.DEV || fields.length === 0) {
    return;
  }

  console.warn(
    `[navfolio comments] ${provider} comments are enabled but missing required config: ${fields.join(
      ', ',
    )}. The comment block will not render for this page.`,
  );
}

export function getCommentProvider(config: CommentsConfig): CommentProvider | null {
  if (!config.enabled || !config.show_on_posts || config.provider === 'none') {
    return null;
  }

  return config.provider;
}

export function getMissingProviderFields(config: CommentsConfig, provider: CommentProvider) {
  if (provider === 'giscus') {
    return giscusRequiredFields.filter((field) => !config.giscus[field]?.trim());
  }

  if (provider === 'utterances') {
    return config.utterances.repo.trim() ? [] : ['repo'];
  }

  if (provider === 'waline') {
    return config.waline.server_url.trim() ? [] : ['server_url'];
  }

  return [];
}

export function canRenderProvider(config: CommentsConfig, provider: CommentProvider) {
  const missingFields = getMissingProviderFields(config, provider);
  warnMissingCommentConfig(provider, missingFields);

  return missingFields.length === 0;
}

export function shouldRenderWalinePageView(config: CommentsConfig) {
  if (
    !config.enabled ||
    !config.show_on_posts ||
    config.provider !== 'waline' ||
    !config.waline.pageview
  ) {
    return false;
  }

  const missingFields = getMissingProviderFields(config, 'waline');
  warnMissingCommentConfig('waline', missingFields);

  return missingFields.length === 0;
}
