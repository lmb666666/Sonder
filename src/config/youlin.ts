import type { SiteConfig } from './schema';
import { parseGitHubRepository } from '../lib/github';

/**
 * Youlin 配置解析层。
 *
 * - 所有字段都有默认值；baseUrl 为空时各 source 链会跳过 youlin。
 * - 环境变量 SONDER_YOULIN_BASE_URL / SONDER_YOULIN_MODE 覆盖 TOML。
 * - 这里只做纯配置计算，不发请求，便于在 astro.config、页面与字体脚本中复用。
 */

export type YoulinMode = SiteConfig['youlin']['mode'];
export type YoulinLinkSource = SiteConfig['youlin']['links']['sources'][number];
export type YoulinCircleSource = SiteConfig['youlin']['circle']['sources'][number];
export type YoulinApplyProvider = SiteConfig['youlin']['apply']['provider'];
export type YoulinDirectiveSource = SiteConfig['youlin']['directives']['friendCircle'];
export type ApplyProvider = 'youlin' | 'github' | 'none';

export interface ResolvedYoulinConfig {
  baseUrl: string;
  timeoutMs: number;
  links: {
    mode: YoulinMode;
    sources: YoulinLinkSource[];
    group: string;
  };
  circle: {
    mode: YoulinMode;
    sources: YoulinCircleSource[];
    limit: number;
  };
  apply: {
    provider: YoulinApplyProvider;
    turnstileSiteKey: string;
    timeoutMs: number;
  };
  directives: {
    friendCircle: YoulinDirectiveSource;
    friendLinkCard: YoulinDirectiveSource;
  };
}

function envValue(name: string): string {
  if (typeof process === 'undefined') return '';
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

/** 统一去掉尾部斜杠；拒绝非 http(s)、账号密码、query 与 hash。 */
export function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || /[?#]/.test(trimmed)) return '';

  try {
    const url = new URL(trimmed);
    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      url.username !== '' ||
      url.password !== '' ||
      url.search !== '' ||
      url.hash !== ''
    ) {
      return '';
    }
    return url.toString().replace(/\/+$/, '');
  } catch {
    return '';
  }
}

/** 日志里去掉 URL 内嵌凭据。 */
function redact(value: string): string {
  return value.replace(/\/\/[^/@]*@/, '//***@');
}

function parseEnvMode(value: string): YoulinMode | null {
  if (value === 'build' || value === 'client') return value;
  if (value) {
    console.warn(`[sonder youlin] 忽略无效的 SONDER_YOULIN_MODE：${value}`);
  }
  return null;
}

export function resolveYoulinConfig(raw: SiteConfig['youlin']): ResolvedYoulinConfig {
  const envBase = envValue('SONDER_YOULIN_BASE_URL');
  let baseUrl = '';

  if (envBase) {
    baseUrl = normalizeBaseUrl(envBase);
    if (!baseUrl) {
      console.warn(`[sonder youlin] 忽略无效的 SONDER_YOULIN_BASE_URL：${redact(envBase)}`);
    }
  }

  if (!baseUrl) {
    baseUrl = normalizeBaseUrl(raw.baseUrl);
    if (raw.baseUrl && !baseUrl) {
      console.warn(`[sonder youlin] 忽略无效的 youlin.baseUrl：${redact(raw.baseUrl)}`);
    }
  }

  const envMode = parseEnvMode(envValue('SONDER_YOULIN_MODE'));
  const globalMode = envMode ?? raw.mode;

  return {
    baseUrl,
    timeoutMs: raw.timeoutMs,
    links: {
      // 环境变量是覆盖层：显式设置时连 per-feature mode 一起覆盖
      mode: envMode ?? raw.links.mode ?? globalMode,
      sources: [...raw.links.sources],
      group: raw.links.group,
    },
    circle: {
      mode: envMode ?? raw.circle.mode ?? globalMode,
      sources: [...raw.circle.sources],
      limit: raw.circle.limit,
    },
    apply: {
      provider: raw.apply.provider,
      turnstileSiteKey: raw.apply.turnstileSiteKey,
      timeoutMs: raw.apply.timeoutMs,
    },
    directives: {
      friendCircle: raw.directives.friendCircle,
      friendLinkCard: raw.directives.friendLinkCard,
    },
  };
}

/**
 * auto：配了 baseUrl 走 Youlin，否则有 GitHub 仓库就走 Issue，最后关闭。
 * 强制 youlin 但 baseUrl 为空时关闭，避免渲染一个打不开的入口。
 */
export function resolveApplyProvider(
  provider: YoulinApplyProvider,
  baseUrl: string,
  repository: string,
): ApplyProvider {
  const hasGitHub = parseGitHubRepository(repository) !== null;
  if (provider === 'youlin') return baseUrl ? 'youlin' : 'none';
  if (provider === 'github') return hasGitHub ? 'github' : 'none';
  if (provider === 'none') return 'none';
  return baseUrl ? 'youlin' : hasGitHub ? 'github' : 'none';
}

/** client 模式只在 Youlin 是第一个 source 时刷新；否则该模式对该功能无效。 */
export function shouldFetchYoulinFirst(
  mode: YoulinMode,
  sources: readonly string[],
  baseUrl: string,
): boolean {
  return mode === 'client' && sources[0] === 'youlin' && Boolean(baseUrl);
}

/**
 * 文章指令的默认数据源：
 * auto 只在配置了 baseUrl 时启用 youlin；否则返回 null，保留原有“未指定 src”警告。
 */
export function resolveDirectiveSource(
  value: YoulinDirectiveSource,
  baseUrl: string,
): 'youlin' | 'demo' | null {
  if (value === 'demo') return 'demo';
  if (value === 'youlin') return 'youlin';
  return baseUrl ? 'youlin' : null;
}

export function youlinLinksUrl(baseUrl: string, group = ''): string {
  if (!baseUrl) return '';
  const base = `${baseUrl}/api/links`;
  const name = group.trim();
  return name ? `${base}?group=${encodeURIComponent(name)}` : base;
}

export function youlinCircleUrl(baseUrl: string, limit = 0): string {
  if (!baseUrl) return '';
  const base = `${baseUrl}/api/circle`;
  return limit > 0 ? `${base}?limit=${limit}` : base;
}

export function youlinApplyUrl(baseUrl: string): string {
  return baseUrl ? `${baseUrl}/apply` : '';
}
