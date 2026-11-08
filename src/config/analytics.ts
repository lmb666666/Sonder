import type { SiteConfig } from './schema';

/**
 * 访问统计配置解析层。
 *
 * - Umami / 51la 的 ID 留空即关闭，不加载任何第三方脚本。
 * - 无效值只警告并关闭对应提供商，不阻断构建。
 * - 这里不读取环境变量；SONDER_ANALYTICS_DISABLED 由组件在构建期处理。
 */

export type AnalyticsConfig = SiteConfig['analytics'];

export interface ResolvedUmamiConfig {
  websiteId: string;
  scriptUrl: string;
  hostUrl: string;
}

export interface ResolvedLa51Config {
  id: string;
  lingqueMonitorId: string;
}

export interface ResolvedAnalyticsConfig {
  sendInDev: boolean;
  umami: ResolvedUmamiConfig | null;
  la51: ResolvedLa51Config | null;
}

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

function warn(message: string) {
  console.warn(`[sonder analytics] ${message}`);
}

function normalizeId(value: string): string {
  const trimmed = value.trim();
  return ID_PATTERN.test(trimmed) ? trimmed : '';
}

function isRemoteHttp(value: string): boolean {
  if (!value.startsWith('http://')) return false;
  try {
    const hostname = new URL(value).hostname;
    return !['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname);
  } catch {
    return false;
  }
}

/**
 * 校验 tracker 脚本地址。允许 http(s)、协议相对 //host/path、站内绝对路径 /path；
 * 允许 query（CDN 版本号），拒绝 hash、账号密码、空白、控制字符和 HTML 特殊字符。
 */
export function normalizeScriptUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/[\s\u0000-\u001f\u007f<>"']/.test(trimmed) || trimmed.includes('#')) return '';

  if (trimmed.startsWith('//')) {
    try {
      const url = new URL(`https:${trimmed}`);
      if (!url.hostname || url.username || url.password) return '';
      return `//${url.host}${url.pathname}${url.search}`;
    } catch {
      return '';
    }
  }

  if (trimmed.startsWith('/')) return trimmed;

  try {
    const url = new URL(trimmed);
    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      url.username !== '' ||
      url.password !== ''
    ) {
      return '';
    }
    return url.toString();
  } catch {
    return '';
  }
}

/**
 * 校验 data-host-url。只接受 http(s) 或协议相对地址；允许路径，不允许 query/hash。
 * 去掉尾部斜杠，Umami 会自行拼接 /api/send。
 */
export function normalizeHostUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/[\s\u0000-\u001f\u007f<>"']/.test(trimmed) || /[?#]/.test(trimmed)) return '';

  const candidate = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;

  try {
    const url = new URL(candidate);
    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      url.username !== '' ||
      url.password !== ''
    ) {
      return '';
    }
    const normalized = url.toString().replace(/\/+$/, '');
    return trimmed.startsWith('//') ? normalized.replace(/^https:/, '') : normalized;
  } catch {
    return '';
  }
}

export function resolveAnalyticsConfig(raw: AnalyticsConfig): ResolvedAnalyticsConfig {
  const umamiId = raw.umami.websiteId.trim();
  const rawUmamiScript = raw.umami.scriptUrl.trim();
  let umami: ResolvedUmamiConfig | null = null;

  if (umamiId || rawUmamiScript) {
    const websiteId = normalizeId(umamiId);
    const scriptUrl = normalizeScriptUrl(rawUmamiScript);

    if (!websiteId) {
      warn('umami.websiteId 为空或无效，已关闭 Umami');
    } else if (!scriptUrl) {
      warn('umami.scriptUrl 为空或无效，已关闭 Umami');
    } else {
      if (isRemoteHttp(scriptUrl)) {
        warn('umami.scriptUrl 使用 http，HTTPS 站点可能被浏览器拦截');
      }

      const rawHost = raw.umami.hostUrl.trim();
      const hostUrl = normalizeHostUrl(rawHost);
      if (rawHost && !hostUrl) {
        warn('umami.hostUrl 无效，已忽略；数据将发到脚本所在域');
      } else if (isRemoteHttp(hostUrl)) {
        warn('umami.hostUrl 使用 http，HTTPS 站点可能被浏览器拦截');
      }
      umami = { websiteId, scriptUrl, hostUrl };
    }
  }

  const la51Id = raw.la51.id.trim();
  const rawLingque = raw.la51.lingqueMonitorId.trim();
  let la51: ResolvedLa51Config | null = null;

  if (la51Id || rawLingque) {
    const id = normalizeId(la51Id);
    if (!id) {
      warn('la51.id 为空或无效，已关闭 51la 与灵雀');
    } else {
      let lingqueMonitorId = '';
      if (rawLingque) {
        lingqueMonitorId = normalizeId(rawLingque);
        if (!lingqueMonitorId) warn('la51.lingqueMonitorId 无效，已跳过灵雀');
      }
      la51 = { id, lingqueMonitorId };
    }
  }

  return { sendInDev: raw.sendInDev, umami, la51 };
}
