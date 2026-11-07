import type { MdastNode } from './handlers';
import type { FriendCirclePost, FriendLinkEntry } from './heavy-handlers';
import type { FriendLinkGroup, FriendPost } from '../../../lib/friend-data';
import { loadYoulinCircle, loadYoulinLinks } from '../../../lib/youlin';
import type { ResolvedYoulinConfig } from '../../../config/youlin';
import { resolveDirectiveSource } from '../../../config/youlin';

/**
 * 指令层的 Youlin 数据预取。
 *
 * 只在文档里真的出现 ::friend-circle / ::friend-link-card 且目标源是
 * youlin 时才发请求；同一 URL 的请求由 lib/youlin 的短缓存合并。
 * 指令输出始终是构建期静态 HTML，不受 /links 页的 mode 影响。
 */

export interface YoulinDirectiveDefaults {
  friendCircle: 'youlin' | 'demo' | null;
  friendLinkCard: 'youlin' | 'demo' | null;
}

export interface YoulinDirectiveData {
  links: FriendLinkEntry[] | null;
  circle: {
    friends: FriendLinkEntry[];
    posts: FriendCirclePost[];
    friendCount: number;
  } | null;
  error?: string;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

function toEntries(groups: FriendLinkGroup[]): FriendLinkEntry[] {
  return groups.flatMap((group) =>
    group.items.map((item) => ({
      name: item.name,
      url: item.url,
      avatar: item.avatar ?? undefined,
      bio: item.bio,
      rss: item.rss ?? undefined,
    })),
  );
}

function toCirclePost(post: FriendPost): FriendCirclePost {
  return {
    title: post.title,
    url: post.url,
    author: post.author,
    avatar: post.avatar ?? undefined,
    date: post.date,
    tags: post.tags,
  };
}

export function getYoulinDirectiveDefaults(config: ResolvedYoulinConfig): YoulinDirectiveDefaults {
  return {
    friendCircle: resolveDirectiveSource(config.directives.friendCircle, config.baseUrl),
    friendLinkCard: resolveDirectiveSource(config.directives.friendLinkCard, config.baseUrl),
  };
}

export async function prefetchYoulinDirectives(
  tree: { children?: MdastNode[] },
  config: ResolvedYoulinConfig,
): Promise<YoulinDirectiveData | null> {
  const defaults = getYoulinDirectiveDefaults(config);
  let needLinks = false;
  let needCircle = false;

  const visit = (nodes: MdastNode[] | undefined) => {
    for (const node of nodes ?? []) {
      if (node.type === 'leafDirective') {
        const src = asString(node.attributes?.src);

        if (node.name === 'friend-circle') {
          const target = src ?? defaults.friendCircle;
          if (target === 'youlin') needCircle = true;
        }

        if (node.name === 'friend-link-card') {
          const name = asString(node.attributes?.name);
          const url = asString(node.attributes?.url);
          const inline = Boolean(name && url);
          const partialInline = Boolean(name || url) && !inline;
          const target = src ?? (inline || partialInline ? null : defaults.friendLinkCard);
          if (target === 'youlin') needLinks = true;
        }
      }
      visit(node.children);
    }
  };
  visit(tree.children);

  if (!needLinks && !needCircle) return null;
  if (!config.baseUrl) {
    return {
      links: null,
      circle: null,
      error: 'youlin.baseUrl 未配置，已回退演示数据',
    };
  }

  const [linksResult, circleResult] = await Promise.all([
    needLinks
      ? loadYoulinLinks(config.baseUrl, {
          group: config.links.group,
          timeoutMs: config.timeoutMs,
        })
      : Promise.resolve(null),
    needCircle
      ? loadYoulinCircle(config.baseUrl, {
          limit: config.circle.limit,
          timeoutMs: config.timeoutMs,
        })
      : Promise.resolve(null),
  ]);

  const errors: string[] = [];
  const links = linksResult?.ok ? toEntries(linksResult.data) : null;
  if (needLinks && linksResult && !linksResult.ok) {
    errors.push(`links: ${linksResult.error}`);
  }

  const circle = circleResult?.ok
    ? {
        friends: links ?? [],
        posts: circleResult.data.posts.map(toCirclePost),
        friendCount: circleResult.data.stats.friends,
      }
    : null;
  if (needCircle && circleResult && !circleResult.ok) {
    errors.push(`circle: ${circleResult.error}`);
  }

  return {
    links,
    circle,
    ...(errors.length > 0 ? { error: errors.join('; ') } : {}),
  };
}
