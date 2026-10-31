import { h } from 'hastscript';

/**
 * Sonder 外挂指令渲染层。
 * 三种层级：容器（:::name…:::）、叶子（::name{attr}）、行内（:name[文字]{attr}）。
 * 全部在构建期输出 HTML，作者零 import，.md / .mdx 通吃。
 */

export type AttributeValue = string | true;

export interface MdastNode {
  type?: string;
  name?: string;
  value?: string;
  attributes?: Record<string, AttributeValue>;
  children?: MdastNode[];
  data?: {
    directiveLabel?: boolean;
    hName?: string;
    hProperties?: Record<string, unknown>;
    hChildren?: HastChild[];
  };
}

export interface DirectiveFile {
  message(value: string, position: unknown, source: string): void;
}

export type HastChild = Record<string, unknown>;
export type HastElement = {
  tagName: string;
  properties: Record<string, unknown>;
  children: HastChild[];
};

export interface ContainerContext {
  node: MdastNode;
  /** 已递归处理过的子节点 */
  children: MdastNode[];
  /** 对任意节点数组再跑一遍指令转换（供 handler 处理自身子指令） */
  transform: (nodes: MdastNode[], parentDirective?: string) => MdastNode[];
  /** 指令方括号标题（`:::name[标题]` 的「标题」） */
  label?: MdastNode[];
  labelText?: string;
  file: DirectiveFile;
}

export interface LeafContext {
  attributes: Record<string, AttributeValue>;
  file: DirectiveFile;
}

export interface InlineContext {
  /** 方括号内的内容（mdast，保留行内 Markdown 能力） */
  label: MdastNode[];
  labelText: string;
  attributes: Record<string, AttributeValue>;
  file: DirectiveFile;
}

export type ContainerHandler = (context: ContainerContext) => MdastNode[];
export type LeafHandler = (context: LeafContext) => MdastNode[];
export type InlineHandler = (context: InlineContext) => MdastNode[];

export function classNames(...values: Array<string | false | undefined>): string[] {
  return values.filter((value): value is string => typeof value === 'string' && value.length > 0);
}

/** 用 data.hName/hProperties 让 mdast-util-to-hast 输出任意元素（layouts 同款技巧）。 */
export function wrap(
  tagName: string,
  className: string[],
  children: MdastNode[],
  properties: Record<string, unknown> = {},
): MdastNode {
  return {
    type: 'blockquote',
    children,
    data: {
      hName: tagName,
      hProperties: { className, ...properties },
    },
  };
}

/** 纯 hast 包装（iframe 等非 mdast 内容走 data.hChildren）。 */
export function wrapHast(
  tagName: string,
  element: HastElement,
  properties: Record<string, unknown> = {},
): MdastNode {
  const sameTag = element.tagName === tagName;

  return {
    type: 'blockquote',
    children: [],
    data: sameTag
      ? {
          hName: tagName,
          hProperties: { ...element.properties, ...properties },
          hChildren: element.children,
        }
      : {
          hName: tagName,
          hProperties: properties,
          hChildren: [{ ...element, properties: { ...element.properties } }],
        },
  };
}

export function unwrapLabel(node: MdastNode): MdastNode | undefined {
  const first = node.children?.[0];
  if (first?.data?.directiveLabel) {
    node.children = node.children?.slice(1);
    return first;
  }
  return undefined;
}

export function labelText(label: MdastNode[] | undefined): string {
  return (label ?? [])
    .map((child) => (typeof child.value === 'string' ? child.value : ''))
    .join('')
    .trim();
}

export function positionOf(node: MdastNode | undefined) {
  return node?.position ?? undefined;
}

export function asString(value: AttributeValue | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function isDirective(node: MdastNode, name: string): boolean {
  return node.type === 'containerDirective' && node.name === name;
}

// ─── 容器：details（折叠面板） ───────────────────────────

function detailsHandler({ node, children, label, labelText, file }: ContainerContext): MdastNode[] {
  if (!label || !labelText) {
    file.message(
      ':::details 缺少 [标题]，已按普通内容渲染。',
      positionOf(node),
      'sonder-directives',
    );
    return children;
  }

  const summary = wrap('summary', ['sd-details-summary'], label);

  return [
    wrap('details', ['sd-details'], [summary, wrap('div', ['sd-details-body'], children)], {
      ...(node.attributes?.open === true ? { open: true } : {}),
    }),
  ];
}

// ─── 容器：grid（图片网格） ─────────────────────────────

function gridHandler({ children }: ContainerContext): MdastNode[] {
  return [wrap('div', ['sd-grid'], children)];
}

// ─── 容器：tabs（标签页，消费 :::tab 子指令） ────────────

function tabsHandler({ children, transform, file }: ContainerContext): MdastNode[] {
  const tabs = children.filter((child) => isDirective(child, 'tab'));

  if (tabs.length === 0) {
    file.message(
      '::::tabs 内没有 :::tab[标题]，已按普通内容渲染。',
      positionOf(children[0]),
      'sonder-directives',
    );
    return children;
  }

  const buttons = tabs.map(
    (tab, index) =>
      h(
        'button',
        {
          class: ['sd-tab-btn', ...(index === 0 ? ['is-active'] : [])],
          type: 'button',
          role: 'tab',
          'aria-selected': index === 0 ? 'true' : 'false',
          'data-sd-tab-btn': String(index),
        },
        [{ type: 'text', value: directiveLabelText(tab) }],
      ) as HastChild,
  );

  const head = {
    type: 'blockquote',
    children: [],
    data: {
      hName: 'div',
      hProperties: { className: ['sd-tabs-head'], role: 'tablist' },
      hChildren: buttons,
    },
  };

  const panels = tabs.map((tab, index) => {
    const label = unwrapLabel(tab);
    const body = transform((tab.children ?? []).map(stripDirectiveLabelData), 'tab', file);
    return wrap('section', ['sd-tab-panel', ...(index === 0 ? ['is-active'] : [])], body, {
      role: 'tabpanel',
      'data-sd-tab-panel': String(index),
      ...(index === 0 ? {} : { hidden: true }),
    });
  });

  return [wrap('div', ['sd-tabs'], [head, ...panels], { 'data-sd-tabs': '' })];
}

function directiveLabelText(node: MdastNode): string {
  const first = node.children?.[0];
  if (first?.data?.directiveLabel) {
    return (first.children ?? [])
      .map((child) => (typeof child.value === 'string' ? child.value : ''))
      .join('')
      .trim();
  }
  return '';
}

function stripDirectiveLabelData(node: MdastNode): MdastNode {
  if (node.data?.directiveLabel) {
    const { directiveLabel: _directiveLabel, ...rest } = node.data;
    return { ...node, data: rest };
  }
  return node;
}

// ─── 容器：提醒块（:::note 家族，复用 callout 渲染） ────

function calloutContainerHandler(remarkCallouts: () => (tree: MdastNode) => void) {
  return ({ node, children, label, labelText }: ContainerContext): MdastNode[] => {
    const fold = asString(node.attributes?.fold);
    const foldable = node.attributes?.foldable === true || fold === '-' || fold === '+';
    const open = node.attributes?.open === true;
    const foldChar = fold === '-' || fold === '+' ? fold : foldable ? (open ? '+' : '-') : '';

    const titleText = labelText ? ` ${labelText}` : '';
    const marker = {
      type: 'paragraph',
      children: [{ type: 'text', value: `[!${node.name}]${foldChar}${titleText}` }],
    };

    const blockquote: MdastNode = {
      type: 'blockquote',
      children: [marker, ...children],
    };

    remarkCallouts()({ type: 'root', children: [blockquote] } as MdastNode);
    return [blockquote];
  };
}

// ─── 叶子：github（构建期读取预取数据） ──────────────────

function githubHandler(cards: Record<string, GithubCardData | undefined>) {
  return ({ attributes, file }: LeafContext): MdastNode[] => {
    const repo = asString(attributes.repo);
    if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
      file.message(
        '::github 需要 {repo="owner/repo"} 属性，已跳过。',
        undefined,
        'sonder-directives',
      );
      return [];
    }

    const key = repo.toLowerCase();
    const data = cards[key];
    const [owner] = key.split('/');
    const url = data?.url ?? `https://github.com/${repo}`;
    const icon = data?.avatarUrl ?? `https://github.com/${owner}.png?size=64`;
    const meta = [
      typeof data?.stars === 'number' ? `★ ${data.stars.toLocaleString('en-US')}` : undefined,
      data?.language ?? undefined,
    ].filter(Boolean);

    const card = h(
      'a',
      {
        class: 'sd-github-card',
        href: url,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
      [
        h('img', { class: 'sd-github-icon', src: icon, alt: '' }),
        h('span', { class: 'sd-github-info' }, [
          h('span', { class: 'sd-github-title' }, [{ type: 'text', value: repo }]),
          h('span', { class: 'sd-github-description' }, [
            { type: 'text', value: data?.description ?? 'GitHub 仓库' },
          ]),
          ...(meta.length > 0
            ? [h('span', { class: 'sd-github-meta' }, [{ type: 'text', value: meta.join(' · ') }])]
            : []),
        ]),
      ],
    );

    return [wrapHast('a', card as unknown as HastElement)];
  };
}

// ─── 叶子：视频 / 音乐嵌入 ──────────────────────────────

function embedHandler(
  provider: string,
  buildSrc: (attributes: Record<string, AttributeValue>) => string | undefined,
) {
  return ({ attributes, file }: LeafContext): MdastNode[] => {
    const src = buildSrc(attributes);
    if (!src) {
      file.message(`::${provider} 缺少必需的属性，已跳过。`, undefined, 'sonder-directives');
      return [];
    }

    const iframe = h('iframe', {
      class: 'sd-embed-frame',
      src,
      loading: 'lazy',
      scrolling: 'no',
      frameborder: 'no',
      allowfullscreen: true,
      allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture',
    });

    return [
      wrapHast('div', iframe as unknown as HastElement, {
        className: ['sd-embed'],
        'data-sd-provider': provider,
      }),
    ];
  };
}

function linkHandler({ attributes, file }: LeafContext): MdastNode[] {
  const href = asString(attributes.href);
  if (!href) {
    file.message('::link 需要 {href} 属性，已跳过。', undefined, 'sonder-directives');
    return [];
  }

  const title = asString(attributes.title) ?? href;
  const description = asString(attributes.description);
  const icon = asString(attributes.icon);
  const domain = href.startsWith('http') ? new URL(href).hostname.replace(/^www\./, '') : undefined;

  const card = h(
    'a',
    {
      class: 'sd-link-card',
      href,
      target: '_blank',
      rel: 'noopener noreferrer',
    },
    [
      h('span', { class: 'sd-link-card-info' }, [
        h('span', { class: 'sd-link-card-title' }, [{ type: 'text', value: title }]),
        h('span', { class: 'sd-link-card-description' }, [
          { type: 'text', value: description ?? domain ?? href },
        ]),
      ]),
      icon ? h('img', { class: 'sd-link-card-icon', src: icon, alt: '' }) : undefined,
    ].filter(Boolean) as HastChild[],
  );

  return [wrapHast('a', card as unknown as HastElement)];
}

// ─── 行内：badge / key / blur / span / btn ───────────────

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function resolveBadgeImage(href: string | undefined, img: string | undefined): string {
  if (img) return img;
  if (!href) return '';

  const github = href.match(/^https?:\/\/github\.com\/([\w.-]+)/i);
  if (github) return `https://github.com/${github[1]}.png?size=64`;

  if (/^https?:\/\//i.test(href)) {
    return `https://www.google.com/s2/favicons?domain=${getDomain(href)}&sz=64`;
  }

  return '';
}

function badgeHandler({ label, labelText, attributes }: InlineContext): MdastNode[] {
  const href = asString(attributes.href);
  const image = resolveBadgeImage(href, asString(attributes.img));
  const round = image ? attributes.square !== true : attributes.round === true;

  const className = classNames('sd-badge', round && 'is-round');
  const properties: Record<string, unknown> = {
    className,
    ...(href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {}),
  };

  // 带图标时行内 Markdown 无法混入 hast，退化为纯文本标签
  if (image) {
    return [
      {
        type: 'emphasis',
        children: [],
        data: {
          hName: href ? 'a' : 'span',
          hProperties: properties,
          hChildren: [
            h('img', { class: 'sd-badge-icon', src: image, alt: '' }),
            h('span', { class: 'sd-badge-text' }, [{ type: 'text', value: labelText }]),
          ] as HastChild[],
        },
      },
    ];
  }

  return [
    {
      type: 'emphasis',
      data: {
        hName: href ? 'a' : 'span',
        hProperties: properties,
      },
    },
  ];
}

function keyHandler({ label, attributes }: InlineContext): MdastNode[] {
  return [
    {
      type: 'emphasis',
      data: {
        hName: 'kbd',
        hProperties: {
          className: classNames('sd-key', attributes.active === true && 'is-active'),
        },
      },
    },
  ];
}

function blurHandler({ label }: InlineContext): MdastNode[] {
  return [
    {
      type: 'emphasis',
      data: {
        hName: 'span',
        hProperties: { className: ['sd-blur'], tabindex: '0' },
      },
    },
  ];
}

function spanHandler({ label, attributes }: InlineContext): MdastNode[] {
  const color = asString(attributes.color);
  const classes = classNames(
    'sd-span',
    typeof attributes.class === 'string' ? attributes.class : undefined,
    Array.isArray(attributes.class) ? (attributes.class as string[]) : undefined,
  );

  return [
    {
      type: 'emphasis',
      data: {
        hName: 'span',
        hProperties: {
          className: classes,
          ...(color ? { style: `color:${color}` } : {}),
        },
      },
    },
  ];
}

function btnHandler({ label, labelText, attributes, file }: InlineContext): MdastNode[] {
  const href = asString(attributes.href);
  if (!href) {
    file.message(':btn 需要 {href} 属性，已按原样保留。', undefined, 'sonder-directives');
    return [{ type: 'text', value: `:btn[${labelText}]` }];
  }

  return [
    {
      type: 'emphasis',
      data: {
        hName: 'a',
        hProperties: {
          className: ['sd-btn'],
          href,
          target: /^https?:\/\//i.test(href) ? '_blank' : undefined,
          rel: /^https?:\/\//i.test(href) ? 'noopener noreferrer' : undefined,
        },
      },
    },
  ];
}

export interface GithubCardData {
  name?: string;
  description?: string;
  stars?: number;
  language?: string;
  avatarUrl?: string;
  url?: string;
}

export {
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
  spanHandler,
  tabsHandler,
};
