import type { AttributeValue, ContainerContext, LeafContext, MdastNode } from './handlers.js';
import { classNames, wrap } from './handlers.js';

/**
 * 重型组件的指令渲染：raw HTML 模板字面量 + 配置 JSON + bundled client 脚本。
 * 模板从对应 .astro 组件逐行翻译，视觉一致。
 */

export function positionOfNode(node: MdastNode | undefined) {
  return node?.position ?? undefined;
}

function asString(value: AttributeValue | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** 将 mdast 子节点序列化为 HTML 字符串（在 remark 阶段由 unified 完成）。 */

// ─── 容器：poetry（诗歌排版） ────────────────────────────

export function poetryHandler({
  node,
  children,
  label,
  labelText,
  file,
}: ContainerContext): MdastNode[] {
  const toHtml = serializeChildren;
  const title = labelText?.split('|')[0]?.trim() || asString(node.attributes?.title);
  const author = labelText?.split('|')[1]?.trim() || asString(node.attributes?.author);
  const footer = asString(node.attributes?.footer);

  const html = `<section class="poetry">${
    title ? `<h2 class="poetry-title">${title}</h2>` : ''
  }${author ? `<div class="poetry-meta">${author}</div>` : ''}<div class="poetry-content">${toHtml(children)}</div>${
    footer ? `<div class="poetry-meta">${footer}</div>` : ''
  }</section>`;

  return [wrapRaw('section', html, { class: 'poetry' })];
}

// ─── 容器：cards（卡片列表） ────────────────────────────

export function cardsHandler({ children }: ContainerContext): MdastNode[] {
  return [wrapRaw('div', serializeChildren(children), { class: 'card-list' })];
}

// ─── 容器：long-image（长图滚动） ────────────────────────

export function longImageHandler({
  node,
  children,
  label,
  labelText,
  file,
}: ContainerContext): MdastNode[] {
  const toHtml = serializeChildren;
  const height = asString(node.attributes?.height) ?? '420px';
  const caption = asString(node.attributes?.caption) ?? labelText;
  const html = `<figure class="sonder-long-image" style="--long-image-height:${height}"><div class="sonder-long-image__viewport" role="region" aria-label="${caption ?? 'Scrollable image'}" tabindex="0">${toHtml(children)}</div>${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`;
  return [wrapRaw('div', html)];
}

// ─── 容器：chat（聊天记录，client 脚本结构化） ───────────

export function chatHandler({ children }: ContainerContext): MdastNode[] {
  const toHtml = serializeChildren;
  const html = `<dl class="chat" data-chat></dl><div class="chat-source" data-chat-source>${toHtml(children)}</div>`;
  return [wrapRaw('div', html)];
}

// ─── 容器：carousel（轮播） ─────────────────────────────

export function carouselHandler({
  node,
  children,
  labelText,
  file,
}: ContainerContext): MdastNode[] {
  const toHtml = serializeChildren;
  const label = asString(node.attributes?.label) ?? labelText ?? 'Carousel';
  const aspect = asString(node.attributes?.aspect);
  const id = `carousel-${Math.random().toString(36).slice(2, 10)}`;
  const chevron = (path: string) =>
    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  const html = `<section id="${id}" class="sonder-carousel" aria-label="${label}"${aspect ? ` style="--carousel-aspect-ratio:${aspect}"` : ''}><div class="sonder-carousel__track" data-track>${toHtml(children)}</div><div class="sonder-carousel__controls"><button type="button" aria-label="Previous slide" data-prev>${chevron('<path d="m15 18-6-6 6-6"/>')}</button><button type="button" aria-label="Next slide" data-next>${chevron('<path d="m9 18 6-6-6-6"/>')}</button></div></section>`;
  return [wrapRaw('div', html)];
}

// ─── 容器：music-score（ABC 乐谱，client abcjs 渲染） ───

export function musicScoreHandler({ children }: ContainerContext): MdastNode[] {
  const abc = children
    .map((child) => (typeof child.value === 'string' ? child.value : ''))
    .join('\n')
    .trim();

  const html = `<div class="music-score" data-music-score data-soundfonts="https://paulrosen.github.io/midi-js-soundfonts/"><pre class="music-score-source" hidden>${abc}</pre><div class="music-score-score"></div><div class="music-score-synth"></div></div>`;
  return [wrapRaw('div', html)];
}

// ─── 叶子：music-player（provider 嵌入模式） ────────────

function providerEmbedUrl(provider: string, url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (provider === 'spotify' && parsed.hostname === 'open.spotify.com') {
      return `https://open.spotify.com/embed${parsed.pathname}`;
    }
    if (provider === 'youtube' && parsed.hostname.includes('youtube.com')) {
      return `https://www.youtube-nocookie.com/embed${parsed.pathname}`;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function musicPlayerHandler({
  attributes,
  file,
}: {
  attributes: Record<string, AttributeValue>;
  file: { message(v: string, p: unknown, s: string): void };
}): MdastNode[] {
  const provider = asString(attributes.provider);
  const url = asString(attributes.url);
  const title = asString(attributes.title) ?? '示例曲目';

  if (provider && url) {
    const embedUrl = providerEmbedUrl(provider, url);
    if (embedUrl) {
      const height = provider === 'spotify' ? '152' : provider === 'youtube' ? '390' : '166';
      const html = `<div class="music-player music-player--embed"><iframe src="${embedUrl}" width="100%" height="${height}" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" title="${title}"></iframe></div>`;
      return [wrapRaw('div', html)];
    }
  }

  file.message(
    '::music-player 指令目前仅支持 provider 嵌入模式（spotify / youtube），原生播放器请用 MDX import。',
    undefined,
    'sonder-directives',
  );
  return [];
}

// ─── 叶子：friend-link-card（友链卡片网格） ─────────────

function friendLinkCardHtml(
  items: Array<{ name?: string; url?: string; description?: string; avatar?: string }>,
  columns: number,
): string {
  const cards = items
    .map(
      (item) =>
        `<a class="friend-link-card" href="${item.url ?? '#'}" target="_blank" rel="noopener noreferrer">${
          item.avatar
            ? `<img class="friend-link-card__avatar" src="${item.avatar}" alt="" loading="lazy" decoding="async" />`
            : `<span class="friend-link-card__avatar" aria-hidden="true">${(item.name ?? '?')[0]?.toUpperCase() ?? '?'}</span>`
        }<span class="friend-link-card__heading">${item.name ?? ''}</span>${
          item.description
            ? `<span class="friend-link-card__description">${item.description}</span>`
            : ''
        }</a>`,
    )
    .join('');
  return `<div class="friend-link-card-grid" style="--flink-columns:${columns}">${cards}</div>`;
}

export function friendLinkCardHandler(
  dataSources: Record<
    string,
    { friends: Array<{ name: string; url: string; description?: string; avatar?: string }> }
  >,
) {
  return ({
    attributes,
    file,
  }: {
    attributes: Record<string, AttributeValue>;
    file: { message(v: string, p: unknown, s: string): void };
  }): MdastNode[] => {
    const src = asString(attributes.src);
    const columns = Number(asString(attributes.columns) ?? '3') || 3;

    let items: Array<{ name?: string; url?: string; description?: string; avatar?: string }> = [];
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
            description: asString(attributes.description),
            avatar: asString(attributes.avatar),
          },
        ];
      }
    }

    if (items.length === 0) {
      file.message('::friend-link-card 缺少 items 或 src 属性。', undefined, 'sonder-directives');
      return [];
    }

    return [wrapRaw('div', friendLinkCardHtml(items, columns))];
  };
}

// ─── 叶子：friend-circle（朋友圈，client 脚本洗牌） ─────

export function friendCircleHandler(
  dataSources: Record<string, { friends: unknown[]; posts: Array<Record<string, string>> }>,
) {
  return ({
    attributes,
    file,
  }: {
    attributes: Record<string, AttributeValue>;
    file: { message(v: string, p: unknown, s: string): void };
  }): MdastNode[] => {
    const src = asString(attributes.src);
    const limit = Number(asString(attributes.limit) ?? '10') || 10;
    const title = asString(attributes.title) ?? '朋友动态';

    const dataSource = src ? dataSources[src] : undefined;
    if (!dataSource) {
      file.message(`::friend-circle 未找到数据源 ${src}。`, undefined, 'sonder-directives');
      return [];
    }

    const postsHtml = dataSource.posts
      .slice(0, limit)
      .map(
        (post) =>
          `<article class="friend-circle__post"><a class="friend-circle__author-link" href="${post.authorUrl ?? post.url}" target="_blank" rel="noopener noreferrer"><span class="friend-circle__author-avatar" aria-hidden="true">${(post.author ?? '?')[0]?.toUpperCase() ?? '?'}</span><span class="friend-circle__author">${post.author ?? ''}</span></a><a class="friend-circle__post-title" href="${post.url}" target="_blank" rel="noopener noreferrer">${post.title ?? ''}</a><span class="friend-circle__post-meta">${post.date ? `<time>${post.date}</time>` : ''}</span></article>`,
      )
      .join('');

    const config = JSON.stringify({
      posts: dataSource.posts,
      initialPosts: dataSource.posts.slice(0, limit),
    }).replace(/</g, '\\u003c');
    const html = `<section class="friend-circle" data-friend-circle data-limit="${limit}" title="${title}"><div class="friend-circle__posts" data-friend-circle-posts>${postsHtml}</div><script type="application/json" data-friend-circle-data>${config}</script></section>`;
    return [wrapRaw('section', html)];
  };
}

// ─── 叶子：friend-link-application（友链申请表单） ──────

export function friendLinkApplicationHandler({
  attributes,
  file,
}: {
  attributes: Record<string, AttributeValue>;
  file: { message(v: string, p: unknown, s: string): void };
}): MdastNode[] {
  const repository = asString(attributes.repository);
  if (!repository) {
    file.message(
      '::friend-link-application 需要 {repository} 属性。',
      undefined,
      'sonder-directives',
    );
    return [];
  }

  const title = asString(attributes.title) ?? '申请友链';
  const description = asString(attributes.description) ?? '';
  const appearance = asString(attributes.appearance) ?? 'bordered';

  const html = `<div data-friend-link-application-placeholder data-fla-repository="${repository}" data-fla-title="${title}" data-fla-appearance="${appearance}">${description ? `<p class="friend-link-application__description">${description}</p>` : ''}</div>`;
  return [wrapRaw('div', html)];
}

// ─── raw 包装 ──────────────────────────────────────────

function wrapRaw(
  tagName: string,
  html: string,
  properties: Record<string, unknown> = {},
): MdastNode {
  return {
    type: 'blockquote',
    children: [],
    data: {
      hName: tagName,
      hProperties: properties,
      hChildren: [{ type: 'raw', value: html }],
    },
  };
}

// ─── 容器：media-shelf（媒体架，子指令 :::media-item） ───

export function mediaShelfHandler({
  node,
  children,
  transform,
  file,
}: ContainerContext): MdastNode[] {
  const columns = Number(asString(node.attributes?.columns) ?? '4') || 4;
  const variant = asString(node.attributes?.variant) ?? 'shelf';

  const items = children
    .filter((child) => isDirective(child, 'media-item'))
    .map((child) => {
      const attrs = child.attributes ?? {};
      const imgChild = (child.children ?? []).find((inner) => inner.type === 'image') as
        { url?: string; alt?: string } | undefined;
      return {
        title: asString(attrs.title) ?? '',
        creator: asString(attrs.creator) ?? '',
        type: asString(attrs.type) ?? 'book',
        cover: imgChild?.url,
        coverAspect: asString(attrs['cover-aspect']),
        rating: Number(asString(attrs.rating) ?? '0') || undefined,
      };
    });

  if (items.length === 0) {
    file.message(
      ':::media-shelf 内没有 :::media-item，已按普通内容渲染。',
      positionOf(node),
      'sonder-directives',
    );
    return children;
  }

  const covers = items
    .map((item) => {
      const meta = asString(item.type);
      const rating = item.rating
        ? '★'.repeat(Math.max(1, Math.min(5, Math.round(item.rating))))
        : '';
      return `<figure class="sonder-media-shelf__cover" data-media-type="${meta}">${
        item.cover
          ? `<img src="${item.cover}" alt="${item.title} cover" loading="lazy" decoding="async" />`
          : `<span aria-hidden="true">${meta}</span>`
      }</figure><div class="sonder-media-shelf__content"><strong>${item.title}</strong><span class="sonder-media-shelf__meta"><span class="sonder-media-shelf__creator">${item.creator}</span>${rating ? `<span class="sonder-media-shelf__rating">${rating}</span>` : ''}</span></div>`;
    })
    .join('');

  const html = `<section class="sonder-media-shelf sonder-media-shelf--${variant}" style="--media-shelf-columns:${columns}" aria-label="Media shelf">${covers}</section>`;
  return [wrapRaw('section', html)];
}
