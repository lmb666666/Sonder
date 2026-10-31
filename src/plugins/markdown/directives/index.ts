import remarkCallouts, { calloutTypes } from '../callout/index.js';
import { friendLinkApplicationHandler } from './application.js';
import type { DirectiveFile, MdastNode } from './handlers.js';
import {
  badgeHandler,
  blurHandler,
  btnHandler,
  calloutContainerHandler,
  detailsHandler,
  embedHandler,
  githubHandler,
  gridHandler,
  keyHandler,
  linkHandler,
  positionOf,
  spanHandler,
  tabsHandler,
} from './handlers.js';
import { columnsHandler, timelineHandler } from './layout-handlers.js';
import {
  cardsHandler,
  carouselHandler,
  chatHandler,
  friendCircleHandler,
  friendLinkCardHandler,
  longImageHandler,
  mediaShelfHandler,
  musicScoreHandler,
  poetryHandler,
  type FriendCirclePost,
  type FriendLinkEntry,
} from './heavy-handlers.js';
import {
  fetchMetingTracks,
  musicPlayerEmbedHandler,
  neteasePlaylistHandler,
  resolveNeteaseTarget,
  type MetingTrack,
  type NeteaseMetingType,
} from './player.js';
import friendCircleDemo from '../../../data/friend-circle-demo.json';
import { githubCardData } from './github-cards.js';

/**
 * Sonder 外挂指令统一入口。
 * `:::note` 家族复用 callout 渲染；columns/timeline 由 layouts 迁移而来；
 * 其余指令全部构建期输出 HTML，交互交给 MarkdownWidgets 客户端脚本。
 * 未知指令名展开内容并给出警告；单个 handler 失败只降级自身。
 */

type TreeNode = MdastNode;

type FriendDataSource = { friends: FriendLinkEntry[]; posts: FriendCirclePost[] };

const dataSources: Record<string, FriendDataSource> = {
  demo: friendCircleDemo as unknown as FriendDataSource,
};

/** ::netease 歌单预取结果（id → tracks），转换前由异步预填 */
type NeteasePrefetch = Map<string, MetingTrack[]>;

const calloutTypeNames = new Set<string>(
  calloutTypes.flatMap((definition) => [definition.type, ...(definition.aliases ?? [])]),
);

/** 由父指令消费的子指令，walker 不对它们做独立分发 */
const CONSUMED_CHILDREN: Record<string, string[]> = {
  columns: ['column'],
  timeline: ['event'],
  tabs: ['tab'],
  'media-shelf': ['media-item'],
};

const CONTAINER_HANDLERS: Record<
  string,
  (context: {
    node: TreeNode;
    children: TreeNode[];
    label?: TreeNode[];
    labelText?: string;
    file: DirectiveFile;
  }) => TreeNode[]
> = {
  ...Object.fromEntries(
    [...calloutTypeNames].map((name) => [name, calloutContainerHandler(remarkCallouts)]),
  ),
  details: detailsHandler,
  grid: gridHandler,
  tabs: tabsHandler,
  columns: columnsHandler,
  timeline: timelineHandler,
  poetry: poetryHandler,
  cards: cardsHandler,
  'long-image': longImageHandler,
  chat: chatHandler,
  carousel: carouselHandler,
  'music-score': musicScoreHandler,
  'media-shelf': mediaShelfHandler,
};

const LEAF_HANDLERS: Record<
  string,
  (context: { attributes: Record<string, string | true>; file: DirectiveFile }) => TreeNode[]
> = {
  github: githubHandler(githubCardData),
  bilibili: embedHandler('bilibili', (attributes) => {
    const bvid = typeof attributes.bvid === 'string' ? attributes.bvid : undefined;
    return bvid && /^BV[1-9A-HJ-NP-Za-km-z]{8,12}$/.test(bvid)
      ? `https://player.bilibili.com/player.html?bvid=${bvid}&autoplay=0&danmaku=0`
      : undefined;
  }),
  youtube: embedHandler('youtube', (attributes) => {
    const id = typeof attributes.id === 'string' ? attributes.id : undefined;
    return id && /^[\w-]{6,20}$/.test(id)
      ? `https://www.youtube-nocookie.com/embed/${id}`
      : undefined;
  }),
  link: linkHandler,
  'music-player': musicPlayerEmbedHandler,
  'friend-link-card': friendLinkCardHandler(dataSources),
  'friend-circle': friendCircleHandler(dataSources),
  'friend-link-application': friendLinkApplicationHandler,
};

const INLINE_HANDLERS: Record<
  string,
  (context: {
    label: TreeNode[];
    labelText: string;
    attributes: Record<string, string | true>;
    file: DirectiveFile;
  }) => TreeNode[]
> = {
  badge: badgeHandler,
  key: keyHandler,
  blur: blurHandler,
  span: spanHandler,
  btn: btnHandler,
};

function inlineText(node: TreeNode): string {
  return (node.children ?? [])
    .map((child) => (typeof child.value === 'string' ? child.value : ''))
    .join('');
}

function labelOf(node: TreeNode) {
  const first = node.children?.[0];
  if (first?.data?.directiveLabel) {
    return {
      label: first.children ?? [],
      labelText: inlineText(first).trim(),
    };
  }
  return undefined;
}

/** 取走并移除指令的标签段落（`:::name[标题]` 的标题），避免标题漏进正文 */
function takeLabel(node: TreeNode) {
  const labelInfo = labelOf(node);
  if (labelInfo) {
    node.children = (node.children ?? []).slice(1);
  }
  return labelInfo;
}

/** 预取文档内全部 ::netease 目标（song/playlist/album；radio 无 Meting 解析不预取） */
async function prefetchNeteaseTracks(tree: TreeNode): Promise<NeteasePrefetch> {
  const targets = new Set<string>();
  const visit = (nodes: TreeNode[] | undefined) => {
    for (const node of nodes ?? []) {
      if (node.type === 'leafDirective' && node.name === 'netease') {
        const target = resolveNeteaseTarget(node.attributes ?? {});
        if (target && target.type !== 'radio' && /^\d+$/.test(target.id)) {
          targets.add(`${target.type}:${target.id}`);
        }
      }
      visit(node.children);
    }
  };
  visit(tree.children);

  const map: NeteasePrefetch = new Map();
  await Promise.all(
    [...targets].map(async (key) => {
      const [type, id] = key.split(':') as [NeteaseMetingType, string];
      map.set(key, await fetchMetingTracks(id, type));
    }),
  );
  return map;
}

function transformNodes(
  nodes: TreeNode[],
  parentDirective: string | undefined,
  file: DirectiveFile,
  extras: { netease: NeteasePrefetch },
): TreeNode[] {
  const result: TreeNode[] = [];

  for (const node of nodes) {
    const name = node.name;
    const isDirective =
      node.type === 'containerDirective' ||
      node.type === 'leafDirective' ||
      node.type === 'textDirective';

    if (!isDirective || !name) {
      if (node.children) {
        node.children = transformNodes(node.children, parentDirective, file, extras);
      }
      result.push(node);
      continue;
    }

    // 父指令消费的子指令（column/tab/event/media-item），交给父指令的 handler 处理
    if (parentDirective && CONSUMED_CHILDREN[parentDirective]?.includes(name)) {
      result.push(node);
      continue;
    }

    const containerHandler =
      node.type === 'containerDirective' ? CONTAINER_HANDLERS[name] : undefined;
    const leafHandler =
      node.type === 'leafDirective'
        ? name === 'netease'
          ? neteasePlaylistHandler(extras.netease)
          : LEAF_HANDLERS[name]
        : undefined;
    const inlineHandler = node.type === 'textDirective' ? INLINE_HANDLERS[name] : undefined;

    if (containerHandler) {
      try {
        // 先取走标签段落，再转换子节点：标题不能漏进正文
        const labelInfo = takeLabel(node);
        const inner = transformNodes(node.children ?? [], name, file, extras);
        result.push(
          ...containerHandler({
            node,
            children: inner,
            transform: (nodes, parentName) =>
              transformNodes(nodes, parentName ?? name, file, extras),
            label: labelInfo?.label,
            labelText: labelInfo?.labelText,
            file,
          }),
        );
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        file.message(
          `[sonder-directives] ::${name} 渲染失败，已降级：${detail}`,
          positionOf(node),
          'sonder-directives',
        );
        const fallback = transformNodes(node.children ?? [], name, file, extras);
        result.push(...fallback);
      }
      continue;
    }

    if (leafHandler) {
      try {
        result.push(...leafHandler({ attributes: node.attributes ?? {}, file }));
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        file.message(
          `[sonder-directives] ::${name} 渲染失败：${detail}`,
          positionOf(node),
          'sonder-directives',
        );
      }
      continue;
    }

    if (inlineHandler) {
      try {
        const produced = inlineHandler({
          label: node.children ?? [],
          labelText: inlineText(node).trim(),
          attributes: node.attributes ?? {},
          file,
        });

        for (const output of produced) {
          if (!output.children && !output.data?.hChildren) {
            output.children = node.children ?? [];
          }
        }

        result.push(...produced);
      } catch (error) {
        // 行内指令失败时保留原始文本
        result.push({ type: 'text', value: `:${name}[${inlineText(node)}]` });
      }
      continue;
    }

    // 未知指令：行内保留原文，容器/叶子展开内容
    file.message(
      `未知的指令 :${name}，${node.type === 'textDirective' ? '已按原样保留' : '已展开为普通内容'}。`,
      positionOf(node),
      'sonder-directives',
    );

    if (node.type === 'textDirective') {
      result.push({ type: 'text', value: `:${name}[${inlineText(node)}]` });
      continue;
    }

    result.push(...transformNodes(node.children ?? [], parentDirective, file, extras));
  }

  return result;
}

export default function remarkSonderDirectives() {
  return async (tree: MdastNode, file: DirectiveFile & { path?: string }) => {
    if (!tree.children) return;
    try {
      const extras = { netease: await prefetchNeteaseTracks(tree) };
      tree.children = transformNodes(tree.children, undefined, file, extras);
    } catch (error) {
      // 转换失败时保留原始内容，确保文章不至于空白
      const detail = error instanceof Error ? error.message : String(error);
      file.message(
        `[sonder-directives] 指令转换失败，已降级为原始内容：${detail}`,
        undefined,
        'sonder-directives',
      );
    }
  };
}
