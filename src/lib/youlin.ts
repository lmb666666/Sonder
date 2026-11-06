import type { FriendLinkGroup, FriendLinkItem, FriendPost } from './friend-data';
import { youlinCircleUrl, youlinLinksUrl } from '../config/youlin';

/**
 * Youlin API 客户端与映射层。
 *
 * 只依赖 fetch / URL，不引入 node: 模块，因此构建期和浏览器共用。
 * 响应解析保持容错：缺字段的条目跳过，不因为一条坏数据丢掉整页。
 */

export interface YoulinCircleStats {
  friends: number;
  active: number;
  failed: number;
  articles: number;
  updatedAt: string | null;
}

export interface MappedYoulinCircle {
  posts: FriendPost[];
  stats: YoulinCircleStats;
}

export type YoulinResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface YoulinFetchOptions {
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface YoulinClientMessages {
  note: string;
  circleSummary: string;
  unavailable: string;
  emptyLinks: string;
  emptyCircle: string;
}

export interface YoulinClientConfig {
  linksUrl: string | null;
  circleUrl: string | null;
  timeoutMs: number;
  pageSize: number;
  messages: YoulinClientMessages;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { at: number; data: unknown }>();
const pending = new Map<string, Promise<YoulinResult<unknown>>>();

export function clearYoulinCache(): void {
  cache.clear();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() === '') return false;
  try {
    const url = new URL(value.trim());
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.username === '' &&
      url.password === ''
    );
  } catch {
    return false;
  }
}

function httpUrlOrNull(value: unknown): string | null {
  return isHttpUrl(value) ? value.trim() : null;
}

/** `/api/links` → 现有 FriendLinkGroup 结构；顶层形状不对返回 null，空分组数组视为有效。 */
export function mapYoulinLinks(value: unknown): FriendLinkGroup[] | null {
  if (!isRecord(value) || !Array.isArray(value.groups)) return null;

  const groups: FriendLinkGroup[] = [];
  let rawGroups = false;
  let validGroup = false;
  let rawLinks = false;
  let mappedLinks = 0;

  for (const rawGroup of value.groups) {
    rawGroups = true;
    if (!isRecord(rawGroup)) continue;
    const title = text(rawGroup.name);
    if (!title || !Array.isArray(rawGroup.links)) continue;
    validGroup = true;

    const items: FriendLinkItem[] = [];
    for (const rawLink of rawGroup.links) {
      rawLinks = true;
      if (!isRecord(rawLink)) continue;
      const link = text(rawLink.link);
      if (!isHttpUrl(link)) continue;

      mappedLinks += 1;
      const author = text(rawLink.author);
      const siteTitle = text(rawLink.title);
      const name = siteTitle || author || new URL(link).hostname;
      const bio = text(rawLink.desc) || undefined;
      const avatar = httpUrlOrNull(rawLink.avatar) ?? httpUrlOrNull(rawLink.icon);
      const rss = httpUrlOrNull(rawLink.feed);

      items.push({
        name,
        url: link,
        ...(bio ? { bio } : {}),
        avatar,
        rss,
      });
    }

    if (items.length === 0) continue;
    const description = text(rawGroup.desc);
    groups.push({
      title,
      ...(description ? { description } : {}),
      items,
    });
  }

  // 有原始分组但没有任何合法结构，或有链接条目但全部映射失败：视为响应损坏。
  if (rawGroups && !validGroup) return null;
  if (rawLinks && mappedLinks === 0) return null;

  return groups;
}

/** `/api/circle` → FriendPost + 原始 stats（统计口径由 Youlin 决定）。 */
export function mapYoulinCircle(value: unknown): MappedYoulinCircle | null {
  if (!isRecord(value) || !Array.isArray(value.articles)) return null;

  const rawStats = isRecord(value.stats) ? value.stats : {};
  const number = (field: unknown) =>
    typeof field === 'number' && Number.isFinite(field) ? Math.max(0, Math.trunc(field)) : 0;

  const stats: YoulinCircleStats = {
    friends: number(rawStats.friends),
    active: number(rawStats.active),
    failed: number(rawStats.failed),
    articles: number(rawStats.articles),
    updatedAt: typeof rawStats.updatedAt === 'string' ? rawStats.updatedAt : null,
  };

  const posts: FriendPost[] = [];
  for (const rawArticle of value.articles) {
    if (!isRecord(rawArticle)) continue;
    const title = text(rawArticle.title);
    const link = text(rawArticle.link);
    if (!title || !isHttpUrl(link)) continue;

    const author = text(rawArticle.author) || '朋友';
    const avatar = httpUrlOrNull(rawArticle.avatar);
    const publishedAt = text(rawArticle.publishedAt);

    posts.push({
      title,
      url: link,
      author,
      avatar,
      ...(publishedAt ? { date: publishedAt } : {}),
    });
  }

  // 有文章条目但全部不合法：按响应损坏处理，交给 source 链回退。
  if (value.articles.length > 0 && posts.length === 0) return null;

  return { posts, stats };
}

/** 成功后缓存 60 秒；失败不缓存，便于下一次 source 重试。 */
export async function fetchYoulinJson<T>(
  url: string,
  options: YoulinFetchOptions = {},
): Promise<YoulinResult<T>> {
  if (!url) return { ok: false, error: 'baseUrl_missing' };

  const cached = cache.get(url);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { ok: true, data: cached.data as T };
  }

  const inFlight = pending.get(url);
  if (inFlight) return (await inFlight) as YoulinResult<T>;

  const run = (async (): Promise<YoulinResult<unknown>> => {
    const fetchImpl =
      options.fetchImpl ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : undefined);
    if (!fetchImpl) return { ok: false, error: 'fetch_unavailable' };

    try {
      const response = await fetchImpl(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(options.timeoutMs ?? 8000),
      });
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        return { ok: false, error: 'invalid_json' };
      }

      cache.set(url, { at: Date.now(), data });
      return { ok: true, data };
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      if (name === 'TimeoutError' || name === 'AbortError') {
        return { ok: false, error: 'timeout' };
      }
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  })();

  pending.set(url, run);
  try {
    return (await run) as YoulinResult<T>;
  } finally {
    pending.delete(url);
  }
}

export async function loadYoulinLinks(
  baseUrl: string,
  options: YoulinFetchOptions & { group?: string } = {},
): Promise<YoulinResult<FriendLinkGroup[]>> {
  const url = youlinLinksUrl(baseUrl, options.group);
  const result = await fetchYoulinJson<unknown>(url, options);
  if (!result.ok) return result;
  const groups = mapYoulinLinks(result.data);
  return groups ? { ok: true, data: groups } : { ok: false, error: 'invalid_links_response' };
}

export async function loadYoulinCircle(
  baseUrl: string,
  options: YoulinFetchOptions & { limit?: number } = {},
): Promise<YoulinResult<MappedYoulinCircle>> {
  const url = youlinCircleUrl(baseUrl, options.limit);
  const result = await fetchYoulinJson<unknown>(url, options);
  if (!result.ok) return result;
  const mapped = mapYoulinCircle(result.data);
  return mapped ? { ok: true, data: mapped } : { ok: false, error: 'invalid_circle_response' };
}

/** 日期显示统一为 YYYY-MM-DD（UTC）；非法值原样返回。 */
export function toDisplayDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildYoulinClientConfig(options: {
  linksUrl: string | null;
  circleUrl: string | null;
  timeoutMs: number;
  pageSize: number;
  messages: YoulinClientMessages;
}): YoulinClientConfig | null {
  if (!options.linksUrl && !options.circleUrl) return null;
  return { ...options };
}
