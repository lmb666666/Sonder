import {
  crawlFriendPosts,
  isPlaceholderFeed,
  parseFriendCircleFeed,
  type FriendCircleFeed,
  type FriendLinkGroup,
  type FriendLinkItem,
  type FriendPost,
} from './friend-data';
import { loadYoulinCircle, loadYoulinLinks, type YoulinCircleStats } from './youlin';
import type { ResolvedYoulinConfig, YoulinCircleSource, YoulinLinkSource } from '../config/youlin';

/**
 * 友链 / 朋友圈的 source 链解析。
 *
 * 友链：youlin -> local
 * 朋友圈：youlin -> friendcircle -> public -> rss -> demo
 *
 * 语义：
 * - youlin / friendcircle / public 读取成功（含空结果）即采用，不再继续；
 * - rss 抓到 0 篇时继续下一个 source（沿用旧行为）；
 * - 只有网络 / HTTP / 解析失败才进入下一个 source。
 */

const FEED_TIMEOUT_MS = 8000;

type ReadResult = { ok: true; value: unknown } | { ok: false; error: string };

export interface FriendSourceDeps {
  fetchImpl?: typeof fetch;
  localGroups: FriendLinkGroup[];
  /** 读取 public/ 下的文件；不存在返回 null */
  readPublic?: (file: string) => Promise<string | null>;
  demo?: FriendCircleFeed;
  crawl?: (items: FriendLinkItem[], perFeed?: number) => Promise<FriendPost[]>;
}

export interface ResolvedLinks {
  groups: FriendLinkGroup[];
  source: YoulinLinkSource | null;
  youlinTried: boolean;
  errors: string[];
}

export interface ResolvedCircle {
  posts: FriendPost[];
  friendsCount: number;
  stats: YoulinCircleStats | null;
  source: YoulinCircleSource | null;
  youlinTried: boolean;
  demo: boolean;
  errors: string[];
}

interface ResolveOptions {
  skipYoulin?: boolean;
}

interface CircleResolveOptions extends ResolveOptions {
  links: FriendLinkGroup[];
  feedSrc?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function activeAuthors(posts: FriendPost[]): number {
  return new Set(posts.map((post) => post.author)).size;
}

function friendCount(friends: FriendLinkGroup[], posts: FriendPost[]): number {
  const total = friends.reduce((count, group) => count + group.items.length, 0);
  return total || activeAuthors(posts);
}

async function readFeedSource(source: string, deps: FriendSourceDeps): Promise<ReadResult> {
  if (/^https?:\/\//i.test(source)) {
    const fetchImpl =
      deps.fetchImpl ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : undefined);
    if (!fetchImpl) return { ok: false, error: 'fetch_unavailable' };

    try {
      const response = await fetchImpl(source, {
        signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
      });
      if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
      return { ok: true, value: JSON.parse(await response.text()) };
    } catch (error) {
      return { ok: false, error: errorText(error) };
    }
  }

  const file = source.replace(/^\/+/, '');
  const text = await deps.readPublic?.(file);
  if (!text) return { ok: false, error: `public/${file} 不存在` };

  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, error: `public/${file} 不是合法 JSON` };
  }
}

function parseFeedPayload(value: unknown): FriendCircleFeed | null {
  if (Array.isArray(value)) return parseFriendCircleFeed(value);
  if (isRecord(value) && Array.isArray(value.posts)) return parseFriendCircleFeed(value);
  return null;
}

export async function resolveFriendLinkGroups(
  config: ResolvedYoulinConfig,
  deps: FriendSourceDeps,
  options: ResolveOptions = {},
): Promise<ResolvedLinks> {
  const errors: string[] = [];
  let youlinTried = false;

  for (const source of config.links.sources) {
    if (source === 'youlin') {
      if (options.skipYoulin || !config.baseUrl) continue;
      youlinTried = true;

      const result = await loadYoulinLinks(config.baseUrl, {
        group: config.links.group,
        timeoutMs: config.timeoutMs,
        fetchImpl: deps.fetchImpl,
      });
      if (result.ok) {
        return { groups: result.data, source, youlinTried, errors };
      }
      errors.push(`youlin: ${result.error}`);
      continue;
    }

    if (source === 'local') {
      return { groups: deps.localGroups, source, youlinTried, errors };
    }
  }

  return { groups: [], source: null, youlinTried, errors };
}

export async function resolveFriendCircle(
  config: ResolvedYoulinConfig,
  deps: FriendSourceDeps,
  options: CircleResolveOptions,
): Promise<ResolvedCircle> {
  const errors: string[] = [];
  const triedPublic = new Set<string>();
  let youlinTried = false;

  for (const source of config.circle.sources) {
    if (source === 'youlin') {
      if (options.skipYoulin || !config.baseUrl) continue;
      youlinTried = true;

      const result = await loadYoulinCircle(config.baseUrl, {
        limit: config.circle.limit,
        timeoutMs: config.timeoutMs,
        fetchImpl: deps.fetchImpl,
      });
      if (result.ok) {
        return {
          posts: result.data.posts,
          friendsCount: result.data.stats.friends || friendCount(options.links, result.data.posts),
          stats: result.data.stats,
          source,
          youlinTried,
          demo: false,
          errors,
        };
      }
      errors.push(`youlin: ${result.error}`);
      continue;
    }

    if (source === 'friendcircle') {
      const feedSrc = options.feedSrc?.trim();
      if (!feedSrc) continue;
      if (!/^https?:\/\//i.test(feedSrc)) {
        triedPublic.add(feedSrc.replace(/^\/+/, ''));
      }

      const payload = await readFeedSource(feedSrc, deps);
      if (!payload.ok) {
        errors.push(`friendcircle: ${payload.error}`);
        continue;
      }
      const feed = parseFeedPayload(payload.value);
      if (!feed) {
        errors.push('friendcircle: 数据结构无法识别');
        continue;
      }

      return {
        posts: feed.posts,
        friendsCount: feed.friends.length || friendCount(options.links, feed.posts),
        stats: null,
        source,
        youlinTried,
        demo: false,
        errors,
      };
    }

    if (source === 'public') {
      const file = 'friend-circle.json';
      if (triedPublic.has(file)) continue;
      triedPublic.add(file);

      const text = await deps.readPublic?.(file);
      if (!text) continue;

      let value: unknown;
      try {
        value = JSON.parse(text);
      } catch {
        errors.push(`public: public/${file} 不是合法 JSON`);
        continue;
      }
      const feed = parseFeedPayload(value);
      if (!feed) {
        errors.push('public: 数据结构无法识别');
        continue;
      }

      return {
        posts: feed.posts,
        friendsCount: feed.friends.length || friendCount(options.links, feed.posts),
        stats: null,
        source,
        youlinTried,
        demo: false,
        errors,
      };
    }

    if (source === 'rss') {
      const feeds = options.links
        .flatMap((group) => group.items)
        .filter((item) => item.rss && !isPlaceholderFeed(item.rss));
      if (feeds.length === 0) continue;

      try {
        const posts = await (deps.crawl ?? crawlFriendPosts)(feeds);
        if (posts.length > 0) {
          return {
            posts,
            friendsCount: friendCount(options.links, posts),
            stats: null,
            source,
            youlinTried,
            demo: false,
            errors,
          };
        }
        errors.push('rss: 没有抓到文章');
      } catch (error) {
        errors.push(`rss: ${errorText(error)}`);
      }
      continue;
    }

    if (source === 'demo' && deps.demo) {
      return {
        posts: deps.demo.posts,
        friendsCount: deps.demo.friends.length || friendCount(options.links, deps.demo.posts),
        stats: null,
        source,
        youlinTried,
        demo: true,
        errors,
      };
    }
  }

  return {
    posts: [],
    friendsCount: friendCount(options.links, []),
    stats: null,
    source: null,
    youlinTried,
    demo: false,
    errors,
  };
}
