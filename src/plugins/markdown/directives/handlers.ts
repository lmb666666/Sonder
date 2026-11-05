import { h } from './h.js';
import type { Element, ElementContent } from 'hast';

/**
 * Sonder 外挂指令渲染层。
 * 三种层级：容器（:::name…:::）、叶子（::name{attr}）、行内（:name[文字]{attr}）。
 * 全部在构建期输出 HTML，作者零 import，直接写在 .md 里。
 */

export type AttributeValue = string | true;

export interface MdastNode {
  type?: string;
  name?: string;
  value?: string;
  attributes?: Record<string, AttributeValue>;
  children?: MdastNode[];
  position?: unknown;
  url?: string;
  alt?: string;
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

export type HastChild = ElementContent & { properties?: Element['properties'] };
export type HastElement = Element;

export interface ContainerContext {
  node: MdastNode;
  /** 已递归处理过的子节点 */
  children: MdastNode[];
  /** 对任意节点数组再跑一遍指令转换（供 handler 处理自身子指令） */
  transform: (nodes: MdastNode[], parentDirective?: string, file?: DirectiveFile) => MdastNode[];
  /** 指令方括号标题（`:::name[标题]` 的「标题」） */
  label?: MdastNode[];
  labelText?: string;
  /** 指令层本地化文案（目前媒体架用于状态标签）。 */
  statusLabels?: Record<string, string>;
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

export function textOf(nodes: MdastNode[] | undefined): string {
  return (nodes ?? [])
    .map((node) => {
      if (typeof node.value === 'string') return node.value;
      if (node.type === 'image') return node.alt ?? '';
      return textOf(node.children);
    })
    .join('');
}

export function labelText(label: MdastNode[] | undefined): string {
  return textOf(label).trim();
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

function detailsHandler({ node, children, label, file }: ContainerContext): MdastNode[] {
  if (!label) {
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

/** 判断「只含图片（允许夹杂空白软换行）」的段落 */
function isImageOnlyParagraph(node: MdastNode): boolean {
  return (
    node.type === 'paragraph' &&
    (node.children ?? []).some((child) => child.type === 'image') &&
    (node.children ?? []).every(
      (child) => child.type === 'image' || (child.type === 'text' && !child.value?.trim()),
    )
  );
}

function gridHandler({ children }: ContainerContext): MdastNode[] {
  // 相邻图片行在 Markdown 里会合并成同一段落（中间是空白软换行），拆开让每张图独立成网格项
  const items = children.flatMap((child) =>
    isImageOnlyParagraph(child)
      ? (child.children ?? []).filter((node) => node.type === 'image')
      : [child],
  );
  return [wrap('div', ['sd-grid'], items)];
}

// ─── 容器：btns（按钮组） ────────────────────────────────

const BTNS_LAYOUTS = new Set(['wide', 'fill', 'grid-2', 'grid-3', 'grid-4']);

function btnsHandler({ node, children }: ContainerContext): MdastNode[] {
  const layout = asString(node.attributes?.layout) ?? 'flex';
  // 每行一个 :btn 在 Markdown 里会合并成同一段落，拆开让每个按钮独立成项
  const items = children.flatMap((child) =>
    child.type === 'paragraph' ? (child.children ?? []) : [child],
  );
  return [
    wrap('div', classNames('sd-btns', BTNS_LAYOUTS.has(layout) && `sd-btns--${layout}`), items, {
      'data-sd-btns': layout,
    }),
  ];
}

// ─── 容器：tabs（标签页，消费 :::tab 子指令） ────────────

let tabsGroupIndex = 0;

function tabsHandler({ children, transform, file }: ContainerContext): MdastNode[] {
  const tabs = children.filter((child) => isDirective(child, 'tab'));
  const extras = children.filter((child) => !isDirective(child, 'tab'));

  if (tabs.length === 0) {
    file.message(
      '::::tabs 内没有 :::tab[标题]，已按普通内容渲染。',
      positionOf(children[0]),
      'sonder-directives',
    );
    return children;
  }

  if (extras.length > 0) {
    file.message(
      '::::tabs 内只有 :::tab 会进入标签页，其余内容已保留在标签页之后。',
      positionOf(extras[0]),
      'sonder-directives',
    );
  }

  const groupId = `sd-tabs-${++tabsGroupIndex}`;
  const buttons = tabs.map(
    (tab, index) =>
      h(
        'button',
        {
          id: `${groupId}-tab-${index}`,
          class: ['sd-tab-btn', ...(index === 0 ? ['is-active'] : [])],
          type: 'button',
          role: 'tab',
          'aria-selected': index === 0 ? 'true' : 'false',
          'aria-controls': `${groupId}-panel-${index}`,
          'data-sd-tab-btn': String(index),
        },
        { type: 'text', value: directiveLabelText(tab) },
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
    const title = label ? wrap('p', ['sd-tab-panel-title'], label.children ?? []) : undefined;
    const body = transform((tab.children ?? []).map(stripDirectiveLabelData), 'tab', file);
    return wrap(
      'section',
      ['sd-tab-panel', ...(index === 0 ? ['is-active'] : [])],
      [...(title ? [title] : []), ...body],
      {
        id: `${groupId}-panel-${index}`,
        role: 'tabpanel',
        'aria-labelledby': `${groupId}-tab-${index}`,
        'data-sd-tab-panel': String(index),
      },
    );
  });

  return [wrap('div', ['sd-tabs'], [head, ...panels], { 'data-sd-tabs': '' }), ...extras];
}

function directiveLabelText(node: MdastNode): string {
  const first = node.children?.[0];
  return first?.data?.directiveLabel ? textOf(first.children).trim() : '';
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
  return ({ node, children, labelText }: ContainerContext): MdastNode[] => {
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

function githubCardHandler(cards: Record<string, GithubCardData | undefined>) {
  return ({ attributes, file }: LeafContext): MdastNode[] => {
    const repo = asString(attributes.repo);
    if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
      file.message(
        '::github-card 需要 {repo="owner/repo"} 属性，已跳过。',
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

const VIDEO_IFRAME_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture';

/** 纸面卡片化的视频容器（raw video 元素或 iframe 嵌入通用） */
export function videoCardNode(
  child: HastElement,
  options: { ratio?: string; zoomFactor?: number } = {},
): MdastNode[] {
  const ratio = options.ratio ?? '16 / 9';
  return [
    wrapHast('div', child as unknown as HastElement, {
      className: ['sd-video'],
      style: `aspect-ratio:${ratio}`,
      ...(options.zoomFactor ? { 'data-sd-video-zoom': String(options.zoomFactor) } : {}),
    }),
  ];
}

/** 本地/直链视频文件（::video） */
export function videoHandler({ attributes, file }: LeafContext): MdastNode[] {
  const src = asString(attributes.src);
  if (!src) {
    file.message(
      '::video 需要 {src="视频文件地址"} 属性，已跳过。',
      undefined,
      'sonder-directives',
    );
    return [];
  }
  const poster = asString(attributes.poster);
  const video = h(
    'video',
    {
      controls: true,
      preload: 'metadata',
      src,
      ...(poster ? { poster } : {}),
    },
    ['你的浏览器不支持视频播放。'],
  );
  return videoCardNode(video as unknown as HastElement, { ratio: asString(attributes.ratio) });
}

/** 抖音播放器（::douyin）：竖屏默认，{wide} 切横屏；zoom 补偿由 widget 按容器宽度计算 */
export function douyinHandler({ attributes, file }: LeafContext): MdastNode[] {
  const vid = asString(attributes.vid) ?? asString(attributes.id);
  if (!vid || !/^\d+$/.test(vid)) {
    file.message(
      '::douyin 需要 {vid="抖音视频 ID"} 属性，已跳过。',
      undefined,
      'sonder-directives',
    );
    return [];
  }
  const wide = attributes.wide === true;
  return videoCardNode(
    h('iframe', {
      src: `https://open.douyin.com/player/video?vid=${vid}`,
      scrolling: 'no',
      loading: 'lazy',
      allow: VIDEO_IFRAME_ALLOW,
      title: `抖音视频 ${vid}`,
    }) as unknown as HastElement,
    wide ? { ratio: '1198 / 731', zoomFactor: 0.00134 } : { ratio: '27 / 56', zoomFactor: 0.0031 },
  );
}

/** TikTok 播放器（::tiktok） */
export function tiktokHandler({ attributes, file }: LeafContext): MdastNode[] {
  const id = asString(attributes.id);
  if (!id || !/^\d+$/.test(id)) {
    file.message(
      '::tiktok 需要 {id="TikTok 视频 ID"} 属性，已跳过。',
      undefined,
      'sonder-directives',
    );
    return [];
  }
  return videoCardNode(
    h('iframe', {
      src: `https://www.tiktok.com/embed/v3/${id}`,
      scrolling: 'no',
      loading: 'lazy',
      allow: VIDEO_IFRAME_ALLOW,
      title: `TikTok video ${id}`,
    }) as unknown as HastElement,
  );
}

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

    const providerName: Record<string, string> = {
      bilibili: '哔哩哔哩',
      youtube: 'YouTube',
    };
    const identifier =
      asString(attributes.bvid) ?? asString(attributes.id) ?? asString(attributes.type) ?? '';
    const iframe = h('iframe', {
      class: 'sd-embed-frame',
      src,
      // 屏幕阅读器需要 iframe 标题（WCAG 4.1.2 / Lighthouse frame-title）
      title: `${providerName[provider] ?? provider} 嵌入播放器${identifier ? ` ${identifier}` : ''}`,
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

/** 链接卡片（::link-card 与播放器降级共用） */
export function buildLinkCard(
  href: string,
  title: string,
  description?: string,
  iconSrc?: string,
): HastElement {
  const domain = href.startsWith('http') ? new URL(href).hostname.replace(/^www\./, '') : undefined;

  return h(
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
      iconSrc ? h('img', { class: 'sd-link-card-icon', src: iconSrc, alt: '' }) : undefined,
    ].filter(Boolean) as HastChild[],
  );
}

function linkCardHandler({ attributes, file }: LeafContext): MdastNode[] {
  const href = asString(attributes.href);
  if (!href) {
    file.message('::link-card 需要 {href} 属性，已跳过。', undefined, 'sonder-directives');
    return [];
  }

  const title = asString(attributes.title) ?? href;
  const description = asString(attributes.description);
  const icon = asString(attributes.icon);

  return [wrapHast('a', buildLinkCard(href, title, description, icon) as unknown as HastElement)];
}

// ─── 行内：badge / key / spoiler / span / btn ───────────

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

function badgeHandler({ labelText, attributes }: InlineContext): MdastNode[] {
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

function keyHandler({ labelText, attributes }: InlineContext): MdastNode[] {
  const mods: string[] = (['ctrl', 'shift', 'alt', 'meta', 'win', 'cmd'] as const).filter(
    (mod) => attributes[mod] === true,
  );
  if (attributes.icon === true) mods.push('icon');
  if (attributes['no-icon'] === true) mods.push('no-icon');

  return [
    {
      type: 'emphasis',
      data: {
        hName: 'kbd',
        hProperties: {
          className: classNames('sd-key', attributes.active === true && 'is-active'),
          // 供 widget 脚本点亮真实按键；文本保留作者写法
          'data-key': asString(attributes.code) ?? labelText ?? '',
          ...(mods.length > 0 ? { 'data-mods': mods.join(' ') } : {}),
        },
      },
    },
  ];
}

function spoilerHandler(): MdastNode[] {
  return [
    {
      type: 'emphasis',
      data: {
        hName: 'span',
        // 悬停显形 + 点击/回车切换（widgets/blur.ts），移动端无 hover 也可用
        hProperties: {
          className: ['sd-blur'],
          tabindex: '0',
          role: 'button',
          'aria-pressed': 'false',
        },
      },
    },
  ];
}

function spanHandler({ attributes }: InlineContext): MdastNode[] {
  const color = asString(attributes.color);
  const classes = classNames(
    'sd-span',
    typeof attributes.class === 'string' ? attributes.class : undefined,
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

function btnHandler({ labelText, attributes, file }: InlineContext): MdastNode[] {
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
  spoilerHandler,
  btnHandler,
  btnsHandler,
  calloutContainerHandler,
  detailsHandler,
  embedHandler,
  githubCardHandler,
  gridHandler,
  keyHandler,
  linkCardHandler,
  spanHandler,
  tabsHandler,
};
