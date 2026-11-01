import remarkCallouts, { calloutTypes } from '../callout/index.js';
import { friendLinkApplicationHandler } from './application.js';
import type { ContainerContext, DirectiveFile, MdastNode } from './handlers.js';
import {
  badgeHandler,
  spoilerHandler,
  btnHandler,
  btnsHandler,
  calloutContainerHandler,
  detailsHandler,
  douyinHandler,
  embedHandler,
  githubCardHandler,
  gridHandler,
  keyHandler,
  linkCardHandler,
  positionOf,
  spanHandler,
  tabsHandler,
  tiktokHandler,
  videoHandler,
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
import { audioHandler, musicHandler, prefetchMusic, type MusicPrefetch } from './player.js';
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

const CONTAINER_HANDLERS: Record<string, (context: ContainerContext) => TreeNode[]> = {
  ...(Object.fromEntries(
    [...calloutTypeNames].map((name) => [
      name,
      calloutContainerHandler(remarkCallouts as never) as unknown as (
        context: ContainerContext,
      ) => TreeNode[],
    ]),
  ) as unknown as Record<string, (context: ContainerContext) => TreeNode[]>),
  details: detailsHandler,
  grid: gridHandler,
  btns: btnsHandler,
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
  'github-card': githubCardHandler(githubCardData),
  bilibili: embedHandler('bilibili', (attributes) => {
    const bvid = typeof attributes.bvid === 'string' ? attributes.bvid : undefined;
    if (!bvid || !/^BV[1-9A-HJ-NP-Za-km-z]{8,12}$/.test(bvid)) return undefined;
    // {nano} 小窗模式：无弹幕/推荐模块的极简播放器
    return attributes.nano === true
      ? `https://www.bilibili.com/blackboard/newplayer.html?bvid=${bvid}`
      : `https://player.bilibili.com/player.html?bvid=${bvid}&autoplay=0&danmaku=0`;
  }),
  video: videoHandler,
  douyin: douyinHandler,
  tiktok: tiktokHandler,
  youtube: embedHandler('youtube', (attributes) => {
    const id = typeof attributes.id === 'string' ? attributes.id : undefined;
    return id && /^[\w-]{6,20}$/.test(id)
      ? `https://www.youtube-nocookie.com/embed/${id}`
      : undefined;
  }),
  'link-card': linkCardHandler,
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
  spoiler: spoilerHandler,
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

function transformNodes(
  nodes: TreeNode[],
  parentDirective: string | undefined,
  file: DirectiveFile,
  extras: { music: MusicPrefetch },
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
      if (node.attributes) {
        for (const key of Object.keys(node.attributes)) {
          if (node.attributes[key] === '') node.attributes[key] = true;
        }
      }
      result.push(node);
      continue;
    }

    // 裸旗标（{open} {square}）经 remark-directive 解析为空串，统一归一为布尔 true
    if (node.attributes) {
      for (const key of Object.keys(node.attributes)) {
        if (node.attributes[key] === '') node.attributes[key] = true;
      }
    }

    const containerHandler =
      node.type === 'containerDirective' ? CONTAINER_HANDLERS[name] : undefined;
    const leafHandler =
      node.type === 'leafDirective'
        ? name === 'music'
          ? musicHandler(extras.music)
          : name === 'audio'
            ? audioHandler
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

export interface SonderDirectivesOptions {
  layouts?: boolean;
  metingApi?: string;
}

export default function remarkSonderDirectives(options: SonderDirectivesOptions = {}) {
  const metingApi = options.metingApi ?? '';

  return async (tree: MdastNode, file: DirectiveFile & { path?: string }) => {
    if (!tree.children) return;
    try {
      const extras = { music: await prefetchMusic(tree, metingApi) };
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
