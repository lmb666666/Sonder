import remarkCallouts from '../callout/index.js';
import { calloutTypes } from '../callout/index.js';
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
import { githubCardData } from './github-cards.js';

/**
 * Sonder 外挂指令统一入口。
 * `:::note` 家族复用 callout 渲染；columns/timeline 由 layouts 迁移而来；
 * 其余指令全部构建期输出 HTML。未知指令名展开内容并给出警告。
 */

type TreeNode = MdastNode;

const calloutTypeNames = new Set<string>(
  calloutTypes.flatMap((definition) => [definition.type, ...(definition.aliases ?? [])]),
);

/** 由父指令消费的子指令，walker 不对它们做独立分发 */
const CONSUMED_CHILDREN: Record<string, string[]> = {
  columns: ['column'],
  timeline: ['event'],
  tabs: ['tab'],
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
  netease: embedHandler('netease', (attributes) => {
    const type = typeof attributes.type === 'string' ? attributes.type : '';
    const id = typeof attributes.id === 'string' ? attributes.id : '';
    const outchainType: Record<string, string> = {
      song: '2',
      playlist: '0',
      album: '10',
      radio: '19',
    };
    const heights: Record<string, string> = {
      song: '86',
      album: '430',
      playlist: '450',
      radio: '330',
    };
    if (!outchainType[type] || !/^\d+$/.test(id)) return undefined;
    return `https://music.163.com/outchain/player?type=${outchainType[type]}&id=${id}&auto=0&height=${heights[type]}`;
  }),
  link: linkHandler,
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

function transformNodes(
  nodes: TreeNode[],
  parentDirective: string | undefined,
  file: DirectiveFile,
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
        node.children = transformNodes(node.children, parentDirective, file);
      }
      result.push(node);
      continue;
    }

    // 父指令消费的子指令（column/tab/event），交给父指令的 handler 处理
    if (parentDirective && CONSUMED_CHILDREN[parentDirective]?.includes(name)) {
      result.push(node);
      continue;
    }

    const containerHandler =
      node.type === 'containerDirective' ? CONTAINER_HANDLERS[name] : undefined;
    const leafHandler = node.type === 'leafDirective' ? LEAF_HANDLERS[name] : undefined;
    const inlineHandler = node.type === 'textDirective' ? INLINE_HANDLERS[name] : undefined;

    if (containerHandler) {
      const labelInfo = labelOf(node);
      result.push(
        ...containerHandler({
          node,
          children: transformNodes(node.children ?? [], name, file),
          transform: (nodes, parentName) => transformNodes(nodes, parentName ?? name, file),
          label: labelInfo?.label,
          labelText: labelInfo?.labelText,
          file,
        }),
      );
      continue;
    }

    if (leafHandler) {
      result.push(...leafHandler({ attributes: node.attributes ?? {}, file }));
      continue;
    }

    if (inlineHandler) {
      const produced = inlineHandler({
        label: node.children ?? [],
        labelText: inlineText(node).trim(),
        attributes: node.attributes ?? {},
        file,
      });

      // handler 未带内容时保留方括号内的 mdast（行内 Markdown 能力）
      for (const output of produced) {
        if (!output.children && !output.data?.hChildren) {
          output.children = node.children ?? [];
        }
      }

      result.push(...produced);
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

    result.push(...transformNodes(node.children ?? [], parentDirective, file));
  }

  return result;
}

export default function remarkSonderDirectives() {
  return (tree: MdastNode, file: DirectiveFile & { path?: string }) => {
    if (tree.children) {
      try {
        tree.children = transformNodes(tree.children, undefined, file);
      } catch (error) {
        throw new Error(
          `[sonder-directives] 转换失败 @ ${file.path ?? '(unknown file)'}: ${(error as Error).message}`,
          { cause: error },
        );
      }
    }
  };
}
