import { h } from './h.js';
import type { AttributeValue, ContainerContext, HastChild, MdastNode } from './handlers.js';
import { classNames, labelText, wrap, wrapHast } from './handlers.js';
import { icon } from './icons.js';

/**
 * 重型组件的指令渲染：全部构建期输出（mdast/hast 组合），
 * 交互部分由 MarkdownWidgets 客户端脚本接管（标记探测 + 动态加载）。
 * 视觉与原 .astro 组件逐类名对齐。
 */

export function positionOfNode(node: MdastNode | undefined) {
  return node?.position ?? undefined;
}

function asString(value: AttributeValue | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function positiveInteger(value: AttributeValue | undefined, fallback: number, max: number) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

function firstImage(nodes: MdastNode[] | undefined): MdastNode | undefined {
  for (const node of nodes ?? []) {
    if (node.type === 'image') return node;
    if (node.type === 'link') {
      const image = (node.children ?? []).find((child) => child.type === 'image');
      if (image) return image;
    }
  }
  return undefined;
}

function firstImageLink(nodes: MdastNode[] | undefined): string | undefined {
  for (const node of nodes ?? []) {
    if (node.type === 'link' && (node.children ?? []).some((child) => child.type === 'image')) {
      return node.url;
    }
  }
  return undefined;
}

type HastLike = ReturnType<typeof h>;

// ─── 容器：poetry（诗歌排版） ────────────────────────────

export function poetryHandler({
  node,
  children,
  labelText: labelValue,
}: ContainerContext): MdastNode[] {
  const inlineTitle = labelValue?.split('|')[0]?.trim();
  const inlineAuthor = labelValue?.split('|')[1]?.trim();
  const title = inlineTitle || asString(node.attributes?.title);
  const author = inlineAuthor || asString(node.attributes?.author);
  const footer = asString(node.attributes?.footer);

  const parts: MdastNode[] = [];
  if (title) {
    // 标题取 `|` 切分后的部分，不能整段放行（否则把「|作者」一起带进标题与目录）
    // 用 p 而不是 h2：组件内部标题不应进入页面目录
    parts.push(wrap('p', ['poetry-title'], [{ type: 'text', value: title }]));
  }
  if (author) parts.push(wrap('div', ['poetry-meta'], [{ type: 'text', value: author }]));
  parts.push(wrap('div', ['poetry-content'], children));
  if (footer) parts.push(wrap('div', ['poetry-meta'], [{ type: 'text', value: footer }]));

  return [wrap('section', ['poetry'], parts)];
}

// ─── 容器：cards（卡片列表） ────────────────────────────

export function cardsHandler({ children }: ContainerContext): MdastNode[] {
  return [wrap('div', ['card-list'], children)];
}

/**
 * 网格/轮播的子项展开：Markdown 里相邻图片行会合并成同一段落
 * （图片之间是空白软换行），这里把它们拆开，让每张图片独立成项。
 */
function flattenImageParagraphs(children: MdastNode[]): MdastNode[] {
  return children.flatMap((child) => {
    const imageOnly =
      child.type === 'paragraph' &&
      (child.children ?? []).some((node) => node.type === 'image') &&
      (child.children ?? []).every(
        (node) => node.type === 'image' || (node.type === 'text' && !node.value?.trim()),
      );
    if (imageOnly) {
      return (child.children ?? []).filter((node) => node.type === 'image');
    }
    return [child];
  });
}

// ─── 容器：long-image（长图滚动） ────────────────────────

export function longImageHandler({ node, children, label }: ContainerContext): MdastNode[] {
  const height = asString(node.attributes?.height) ?? '420px';
  const caption = asString(node.attributes?.caption) ?? labelText(label);

  return [
    wrap(
      'figure',
      ['sonder-long-image'],
      [
        wrap('div', ['sonder-long-image__viewport'], children, {
          role: 'region',
          'aria-label': caption ?? 'Scrollable image',
          tabindex: '0',
        }),
        ...(caption ? [wrap('figcaption', [], [{ type: 'text', value: caption }])] : []),
      ],
      { style: `--long-image-height:${height}` },
    ),
  ];
}

// ─── 容器：chat（聊天记录，构建期结构化） ─────────────────

type ChatItem =
  { kind: 'caption'; control: string; name: string } | { kind: 'body'; nodes: MdastNode[] };

/**
 * 把 :::chat 的 mdast 子节点结构化为 dt（署名）/ dd（消息）：
 * - 整段（或整行）匹配 `{名字}` / `{.名字}` / `{:系统}` → 署名
 * - 其余内容 → 消息体（保留行内 Markdown）
 */
function structureChat(children: MdastNode[]): ChatItem[] {
  const items: ChatItem[] = [];

  const captionOf = (nodes: MdastNode[]): { control: string; name: string } | undefined => {
    if (!nodes.every((node) => node.type === 'text' && typeof node.value === 'string')) {
      return undefined;
    }
    const match = /^\{(\.|:)?([^{}]*)\}$/.exec(
      nodes
        .map((node) => node.value)
        .join('')
        .trim(),
    );
    if (!match) return undefined;
    return { control: match[1] ?? '', name: match[2].trim() };
  };

  for (const child of children) {
    if (child.type !== 'paragraph') {
      items.push({ kind: 'body', nodes: [child] });
      continue;
    }

    // 段落内按软换行拆行（remark 把相邻行合并进同一 text 值）
    const lines: MdastNode[][] = [];
    let current: MdastNode[] = [];
    for (const inline of child.children ?? []) {
      if (
        inline.type === 'text' &&
        typeof inline.value === 'string' &&
        inline.value.includes('\n')
      ) {
        const parts = inline.value.split('\n');
        parts.forEach((part, index) => {
          if (index > 0) {
            lines.push(current);
            current = [];
          }
          if (part) current.push({ type: 'text', value: part });
        });
      } else {
        current.push(inline);
      }
    }
    lines.push(current);

    for (const line of lines) {
      if (line.length === 0) continue;
      const caption = captionOf(line);
      if (caption) {
        items.push({ kind: 'caption', ...caption });
      } else {
        items.push({ kind: 'body', nodes: line });
      }
    }
  }

  return items;
}

export function chatHandler({ children }: ContainerContext): MdastNode[] {
  const items = structureChat(children);
  const nodes: MdastNode[] = [];

  for (const item of items) {
    if (item.kind === 'caption') {
      const controlClass =
        item.control === '.' ? 'chat-myself' : item.control === ':' ? 'chat-system' : '';
      nodes.push(
        wrap('dt', classNames('chat-caption', controlClass), [{ type: 'text', value: item.name }]),
      );
    } else {
      nodes.push(wrap('dd', ['chat-body'], item.nodes));
    }
  }

  return [wrap('dl', ['chat'], nodes)];
}

// ─── 容器：carousel（轮播） ─────────────────────────────

export function carouselHandler({
  node,
  children,
  labelText: labelValue,
}: ContainerContext): MdastNode[] {
  const label = asString(node.attributes?.label) ?? labelValue ?? 'Carousel';
  const aspect = asString(node.attributes?.aspect);
  const slides = flattenImageParagraphs(children).map((child) =>
    wrap('figure', [], [child], { 'data-carousel-slide': '' }),
  );

  // data-track 是 wheel 脚本的钩子（按视口宽度滚动），缺了按钮就哑了
  const track = wrap('div', ['sonder-carousel__track'], slides, { 'data-track': '' });
  const controls = wrap('div', ['sonder-carousel__controls'], [], { 'data-carousel-controls': '' });
  // 控制按钮是纯 hast（内联 SVG），走 hChildren 注入
  controls.data = {
    ...controls.data,
    hChildren: [
      h('button', { type: 'button', 'aria-label': 'Previous slide', 'data-prev': '' }, [
        icon('chevron-left', 18),
      ]),
      h('button', { type: 'button', 'aria-label': 'Next slide', 'data-next': '' }, [
        icon('chevron-right', 18),
      ]),
    ] as HastChild[],
  };

  return [
    wrap('section', ['sonder-carousel'], [track, controls], {
      'aria-label': label,
      ...(aspect ? { style: `--carousel-aspect-ratio:${aspect}` } : {}),
    }),
  ];
}

// ─── 容器：music-score（ABC 乐谱，client abcjs 渲染） ───

/** 容器内纯文本提取：段落按行内文本拼接（保留软换行），块级之间以换行分隔 */
function extractText(nodes: MdastNode[] | undefined): string {
  return (nodes ?? [])
    .map((node) => {
      if (typeof node.value === 'string') return node.value;
      if (node.type === 'paragraph' || node.type === 'code') {
        const inline = (node.children ?? [])
          .map((child) => (typeof child.value === 'string' ? child.value : ''))
          .join('');
        return inline || extractText(node.children);
      }
      return extractText(node.children);
    })
    .filter((text) => text.length > 0)
    .join('\n');
}

export function musicScoreHandler({ node, children, file }: ContainerContext): MdastNode[] {
  // ABC 记谱法含 `X:` `T:` `M:` 这类冒号，裸写在容器里会被 remark-directive
  // 当成行内指令解析（`X:1` → 文本 X + 指令 :1），音源必然被撕碎。
  // 因此约定：ABC 必须写在容器内的围栏代码块里，与 mermaid 一致。
  const codeBlock = children.find((child) => child.type === 'code');
  const hasLooseText = children.some(
    (child) => child.type === 'paragraph' || child.type === 'textDirective',
  );

  if (!codeBlock && hasLooseText) {
    file.message(
      ':::music-score 内的 ABC 需写在围栏代码块里（```abc … ```），否则 `X:` `T:` 会被当成行内指令解析。已按纯文本尽力渲染。',
      positionOfNode(node),
      'sonder-directives',
    );
  }

  const abc = (codeBlock ? String(codeBlock.value ?? '') : extractText(children)).trim();
  const element = h('div', { class: 'music-score', 'data-music-score': '' }, [
    h('pre', { class: 'music-score-source', hidden: true }, [abc]),
    h('div', { class: 'music-score-score' }),
    h('div', { class: 'music-score-synth' }),
  ]);
  return [wrapHast('div', element as never)];
}

// ─── 容器：media-shelf（媒体架，子指令 :::media-item） ───

function isDirective(node: MdastNode, name: string): boolean {
  return node.type === 'containerDirective' && node.name === name;
}

export function mediaShelfHandler({ node, children, file }: ContainerContext): MdastNode[] {
  const columns = positiveInteger(node.attributes?.columns, 4, 6);
  const variant = asString(node.attributes?.variant) ?? 'shelf';
  const label = asString(node.attributes?.label) ?? 'Media shelf';

  const items = children
    .filter((child) => isDirective(child, 'media-item'))
    .map((child) => {
      const attrs = child.attributes ?? {};
      const imageParagraph = (child.children ?? []).find(
        (inner) => inner.type === 'paragraph' && firstImage(inner.children),
      );
      const rawRating = Number(asString(attrs.rating) ?? '0');
      return {
        title: asString(attrs.title) ?? '',
        creator: asString(attrs.creator) ?? '',
        type: asString(attrs.type) ?? 'book',
        image: firstImage(imageParagraph?.children),
        coverAspect: asString(attrs['cover-aspect']),
        rating: Number.isFinite(rawRating) ? Math.max(0, Math.min(5, Math.round(rawRating))) : 0,
        status: asString(attrs.status),
        href: asString(attrs.href) ?? firstImageLink(imageParagraph?.children),
        reviewHref: asString(attrs['review-href']),
        reviewLabel: asString(attrs['review-label']),
        note: asString(attrs.note),
      };
    });

  if (items.length === 0) {
    file.message(
      ':::media-shelf 内没有 :::media-item，已按普通内容渲染。',
      positionOfNode(node),
      'sonder-directives',
    );
    return children;
  }

  const itemNodes = items.map((item) => {
    // 封面保留为 mdast 图片节点：享受 Astro 图片处理与点击放大
    const coverChildren: MdastNode[] = item.image
      ? [item.image]
      : [
          {
            type: 'blockquote',
            children: [],
            data: {
              hName: 'span',
              hProperties: { 'aria-hidden': 'true' },
              hChildren: [h('span', [item.type])] as HastChild[],
            },
          },
        ];
    const cover = wrap('figure', ['sonder-media-shelf__cover'], coverChildren, {
      'data-media-type': item.type,
      ...(item.coverAspect ? { 'data-cover-aspect': item.coverAspect } : {}),
    });

    const rating = item.rating
      ? h('span', { class: 'sonder-media-shelf__rating' }, ['★'.repeat(item.rating)])
      : undefined;
    const review =
      item.reviewHref && item.reviewLabel
        ? h('span', { class: 'sonder-media-shelf__review' }, [icon('link', 13), item.reviewLabel])
        : undefined;
    const content: MdastNode = {
      type: 'blockquote',
      children: [],
      data: {
        hName: 'div',
        hProperties: { className: ['sonder-media-shelf__content'] },
        hChildren: [
          h('strong', [item.title]),
          h('span', { class: 'sonder-media-shelf__meta' }, [
            h('span', { class: 'sonder-media-shelf__creator' }, [item.creator]),
            ...(rating ? [rating] : []),
          ]),
          item.status
            ? h('span', { class: 'sonder-media-shelf__status', 'data-status': item.status }, [
                item.status,
              ])
            : undefined,
          review,
          item.note ? h('p', [item.note]) : undefined,
        ].filter(Boolean) as HastChild[],
      },
    };

    const destination = item.reviewHref ?? item.href;
    if (!destination) {
      return wrap('article', ['sonder-media-shelf__item'], [cover, content]);
    }

    return wrap(
      'a',
      ['sonder-media-shelf__item'],
      [cover, content],
      item.reviewHref
        ? { href: destination }
        : { href: destination, target: '_blank', rel: 'noreferrer' },
    );
  });

  return [
    wrap('section', ['sonder-media-shelf', `sonder-media-shelf--${variant}`], itemNodes, {
      style: `--media-shelf-columns:${columns}`,
      'aria-label': label,
    }),
  ];
}

// ─── 叶子：friend-link-card（友链卡片网格） ─────────────

export interface FriendLinkEntry {
  name?: string;
  url?: string;
  avatar?: string;
  bio?: string;
  description?: string;
  backgroundImage?: string;
  rss?: string;
}

function friendLinkCardElement(item: FriendLinkEntry, preview = false): HastLike {
  const name = (item.name ?? '').trim();
  const avatar = (item.avatar ?? '').trim();
  const bio = (item.bio ?? item.description ?? '').trim();
  const backgroundImage = (item.backgroundImage ?? '').trim() || avatar;
  const displayName = name || (preview ? '你的站点' : '');

  const avatarContent = avatar
    ? h('img', { src: avatar, alt: '', loading: 'lazy', decoding: 'async' })
    : h('span', [(displayName[0] || '?').toUpperCase()]);

  return h(
    'a',
    {
      class: ['friend-link-card', ...(backgroundImage ? ['friend-link-card--with-image'] : [])],
      ...(preview ? {} : { href: item.url ?? '#', target: '_blank', rel: 'noopener noreferrer' }),
      title: displayName,
    },
    [
      backgroundImage
        ? h('img', {
            class: 'friend-link-card__background',
            src: backgroundImage,
            alt: '',
            loading: 'lazy',
            decoding: 'async',
            'aria-hidden': 'true',
          })
        : undefined,
      h('span', { class: 'friend-link-card__avatar', 'aria-hidden': 'true' }, [avatarContent]),
      (item.rss ?? '').trim()
        ? h('span', { class: 'friend-link-card__rss', title: `RSS: ${(item.rss ?? '').trim()}` }, [
            icon('rss', 12),
          ])
        : undefined,
      h('span', { class: 'friend-link-card__meta' }, [
        h('span', { class: 'friend-link-card__heading' }, [
          h('strong', [displayName]),
          icon('link', 13),
        ]),
        bio ? h('span', { class: 'friend-link-card__bio' }, [bio]) : undefined,
      ]),
    ].filter(Boolean),
  );
}

export function friendLinkCardHandler(dataSources: Record<string, { friends: FriendLinkEntry[] }>) {
  return ({
    attributes,
    file,
  }: {
    attributes: Record<string, AttributeValue>;
    file: { message(v: string, p: unknown, s: string): void };
  }): MdastNode[] => {
    const src = asString(attributes.src);
    const columns = positiveInteger(attributes.columns, 4, 4);

    let items: FriendLinkEntry[] = [];
    if (src) {
      const dataSource = dataSources[src];
      if (dataSource) {
        items = dataSource.friends;
      } else {
        file.message(`::friend-link-card 未找到数据源 ${src}。`, undefined, 'sonder-directives');
      }
    } else {
      const name = asString(attributes.name);
      const url = asString(attributes.url);
      if (name && url) {
        items = [
          {
            name,
            url,
            avatar: asString(attributes.avatar),
            bio: asString(attributes.bio) ?? asString(attributes.description),
            backgroundImage: asString(attributes['background-image']),
            rss: asString(attributes.rss),
          },
        ];
      }
    }

    if (items.length === 0) {
      file.message(
        '::friend-link-card 缺少 src 或 name/url 属性。',
        undefined,
        'sonder-directives',
      );
      return [];
    }

    const grid = h('div', { class: 'friend-link-region' }, [
      h(
        'div',
        { class: 'friend-link-list', style: `--friend-link-columns:${columns}` },
        items.map((item) => friendLinkCardElement(item)),
      ),
    ]);
    return [wrapHast('div', grid as never)];
  };
}

// ─── 叶子：friend-circle（朋友圈，client 脚本洗牌） ─────

export interface FriendCirclePost {
  title?: string;
  url?: string;
  author?: string;
  authorUrl?: string;
  avatar?: string;
  date?: string;
  tags?: string[];
}

function friendCirclePostElement(post: FriendCirclePost): HastLike {
  const author = (post.author ?? '?').trim();
  const avatar = (post.avatar ?? '').trim();
  const tags = (post.tags ?? []).slice(0, 3);
  return h('article', { class: 'friend-circle__post' }, [
    h(
      'a',
      {
        class: 'friend-circle__author-link',
        href: post.authorUrl || post.url || '#',
        target: '_blank',
        rel: 'noopener noreferrer',
      },
      [
        h('span', { class: 'friend-circle__author-avatar', 'aria-hidden': 'true' }, [
          avatar
            ? h('img', { src: avatar, alt: '', loading: 'lazy', decoding: 'async' })
            : h('span', [(author[0] || '?').toUpperCase()]),
        ]),
        h('span', { class: 'friend-circle__author' }, [author]),
      ],
    ),
    h(
      'a',
      {
        class: 'friend-circle__post-title',
        href: post.url || '#',
        target: '_blank',
        rel: 'noopener noreferrer',
      },
      [post.title ?? ''],
    ),
    h(
      'span',
      { class: 'friend-circle__post-meta' },
      [
        tags.length
          ? h(
              'span',
              { class: 'friend-circle__tags' },
              tags.map((tag) => h('span', [tag])),
            )
          : undefined,
        post.date ? h('time', { datetime: post.date }, [post.date]) : undefined,
      ].filter(Boolean),
    ),
  ]);
}

export function friendCircleHandler(
  dataSources: Record<string, { friends: FriendLinkEntry[]; posts: FriendCirclePost[] }>,
) {
  return ({
    attributes,
    file,
  }: {
    attributes: Record<string, AttributeValue>;
    file: { message(v: string, p: unknown, s: string): void };
  }): MdastNode[] => {
    const src = asString(attributes.src);
    const limit = positiveInteger(attributes.limit, 10, 100);
    const title = asString(attributes.title) ?? '朋友动态';

    const dataSource = src ? dataSources[src] : undefined;
    if (!dataSource) {
      file.message(`::friend-circle 未找到数据源 ${src}。`, undefined, 'sonder-directives');
      return [];
    }

    const normalizeDate = (value?: string) => {
      if (!value) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.valueOf())) return value;

      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const posts = dataSource.posts.map((post) => ({ ...post, date: normalizeDate(post.date) }));
    const initialPosts = posts.slice(0, limit);
    const activeFriends = new Set(posts.map((post) => post.authorUrl || post.author)).size;

    const header = h('header', { class: 'friend-circle__header' }, [
      h('div', [
        h('p', { class: 'friend-circle__eyebrow' }, [icon('rss', 14, 1.8), title]),
        h('p', { class: 'friend-circle__stats' }, [
          `${dataSource.friends.length} friends`,
          h('span', { 'aria-hidden': 'true' }, ['/']),
          `${activeFriends} active`,
          h('span', { 'aria-hidden': 'true' }, ['/']),
          `${posts.length} posts`,
        ]),
      ]),
      h(
        'button',
        {
          class: 'friend-circle__refresh',
          type: 'button',
          'aria-label': '换一批',
          title: '换一批',
          'data-friend-circle-refresh': '',
        },
        [icon('refresh-cw', 17, 1.8)],
      ),
    ]);

    const payload = JSON.stringify({ posts, initialPosts }).replace(/</g, '\\u003c');
    const section = h(
      'section',
      { class: 'friend-circle', 'data-friend-circle': '', 'data-limit': String(limit) },
      [
        header,
        h(
          'div',
          { class: 'friend-circle__posts', 'data-friend-circle-posts': '' },
          initialPosts.map(friendCirclePostElement),
        ),
        h('script', { type: 'application/json', 'data-friend-circle-data': '' }, [payload]),
      ],
    );
    return [wrapHast('section', section as never)];
  };
}
