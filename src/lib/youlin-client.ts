import type { FriendLinkGroup, FriendLinkItem, FriendPost } from './friend-data';
import {
  fetchYoulinJson,
  isHttpUrl,
  mapYoulinCircle,
  mapYoulinLinks,
  toDisplayDate,
  type YoulinCircleStats,
  type YoulinClientConfig,
} from './youlin';
import { bindCircleMore } from './circle-more';

/** 浏览器侧 Youlin 刷新：只替换 /links 页的友链与朋友圈，失败时保留 SSR 回退。 */

const RSS_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>';
const LINK_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function iconSpan(className: string, svg: string): HTMLSpanElement {
  const span = element('span', className);
  span.innerHTML = svg;
  return span;
}

function formatMessage(template: string, values: Record<string, number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}

function createFriendLinkCard(item: FriendLinkItem): HTMLAnchorElement | null {
  const href = item.url?.trim() ?? '';
  if (!isHttpUrl(href)) return null;

  const name = item.name?.trim() || new URL(href).hostname;
  const rawAvatar = item.avatar?.trim() ?? '';
  const avatar = isHttpUrl(rawAvatar) ? rawAvatar : '';
  const bio = item.bio?.trim() ?? '';
  const rss = item.rss?.trim() ?? '';

  const card = document.createElement('a');
  card.className = 'friend-link-card';
  card.href = href;
  card.target = '_blank';
  card.rel = 'noopener noreferrer';
  card.title = name;

  if (avatar) {
    card.classList.add('friend-link-card--with-image');
    const background = document.createElement('img');
    background.className = 'friend-link-card__background';
    background.src = avatar;
    background.alt = '';
    background.loading = 'lazy';
    background.decoding = 'async';
    background.setAttribute('aria-hidden', 'true');
    card.append(background);
  }

  const avatarWrap = element('span', 'friend-link-card__avatar');
  avatarWrap.setAttribute('aria-hidden', 'true');
  if (avatar) {
    const image = document.createElement('img');
    image.src = avatar;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    avatarWrap.append(image);
  } else {
    avatarWrap.append(element('span', undefined, (name[0] || '?').toUpperCase()));
  }
  card.append(avatarWrap);

  if (rss && isHttpUrl(rss)) {
    const rssIcon = iconSpan('friend-link-card__rss', RSS_ICON);
    rssIcon.title = `RSS: ${rss}`;
    card.append(rssIcon);
  }

  const meta = element('span', 'friend-link-card__meta');
  const heading = element('span', 'friend-link-card__heading');
  heading.append(element('strong', undefined, name), iconSpan('', LINK_ICON));
  meta.append(heading);
  if (bio) meta.append(element('span', 'friend-link-card__bio', bio));
  card.append(meta);

  return card;
}

function createCircleCard(post: FriendPost, index: number, pageSize: number): HTMLElement {
  const article = element('article', 'circle-card');
  article.dataset.circleCard = '';
  if (index >= pageSize) article.classList.add('circle-card--hidden');

  const authorHref = isHttpUrl(post.authorUrl) ? post.authorUrl : post.url;
  const author = document.createElement('a');
  author.className = 'circle-card__author';
  author.href = authorHref;
  author.target = '_blank';
  author.rel = 'noopener noreferrer';

  const avatarWrap = element('span', 'circle-card__avatar');
  avatarWrap.setAttribute('aria-hidden', 'true');
  const avatar = post.avatar?.trim() ?? '';
  if (isHttpUrl(avatar)) {
    const image = document.createElement('img');
    image.src = avatar;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    avatarWrap.append(image);
  } else {
    avatarWrap.append(element('span', undefined, (post.author[0] || '?').toUpperCase()));
  }
  author.append(avatarWrap, element('span', 'circle-card__name', post.author));
  article.append(author);

  const title = document.createElement('a');
  title.className = 'circle-card__title';
  title.href = post.url;
  title.target = '_blank';
  title.rel = 'noopener noreferrer';
  title.textContent = post.title;
  article.append(title);

  const meta = element('footer', 'circle-card__meta');
  if (post.tags?.length) {
    const tags = element('span', 'circle-card__tags');
    for (const tag of post.tags.slice(0, 3)) tags.append(element('span', undefined, `#${tag}`));
    meta.append(tags);
  }
  const date = toDisplayDate(post.date);
  if (date) {
    const time = element('time');
    time.dateTime = date;
    time.textContent = date;
    meta.append(time);
  }
  article.append(meta);

  return article;
}

function renderFriendLinks(groups: FriendLinkGroup[], config: YoulinClientConfig): void {
  const root = document.querySelector<HTMLElement>('[data-friend-links]');
  if (!root) return;

  root.replaceChildren();
  groups.forEach((group, index) => {
    const list = element('div', 'friend-link-list');
    for (const item of group.items) {
      const card = createFriendLinkCard(item);
      if (card) list.append(card);
    }
    if (list.childElementCount === 0) return;

    const section = element('section', 'links-group');
    section.setAttribute('aria-labelledby', `links-group-${index}`);
    const heading = element('div', 'links-group-heading');
    const title = element('h2', undefined, group.title);
    title.id = `links-group-${index}`;
    heading.append(title);
    if (group.description) heading.append(element('p', undefined, group.description));

    const region = element('div', 'friend-link-region');
    list.style.setProperty('--friend-link-columns', '4');
    region.append(list);
    section.append(heading, region);
    root.append(section);
  });

  if (root.childElementCount === 0) {
    root.append(element('p', 'links-empty', config.messages.emptyLinks));
  }

  const note = document.querySelector<HTMLElement>('[data-links-note]');
  if (note) {
    const total = groups.reduce((count, group) => count + group.items.length, 0);
    const rss = groups.reduce(
      (count, group) => count + group.items.filter((item) => item.rss).length,
      0,
    );
    note.textContent = formatMessage(config.messages.note, { total, rss });
  }
}

function renderCircle(
  posts: FriendPost[],
  stats: YoulinCircleStats | null,
  config: YoulinClientConfig,
): void {
  const grid = document.querySelector<HTMLElement>('[data-circle-list]');
  if (!grid) return;

  grid.replaceChildren();
  if (posts.length === 0) {
    grid.append(element('p', 'links-empty', config.messages.emptyCircle));
  } else {
    posts.forEach((post, index) => grid.append(createCircleCard(post, index, config.pageSize)));
  }

  const summary = document.querySelector<HTMLElement>('[data-circle-summary]');
  if (summary) {
    const authors = new Set(posts.map((post) => post.author)).size;
    const friends = stats?.friends ?? authors;
    const active = stats?.active ?? authors;
    summary.textContent = formatMessage(config.messages.circleSummary, {
      friends,
      active,
      posts: posts.length,
    });
  }

  bindCircleMore();
}

function showNotice(feature: 'links' | 'circle', text: string): void {
  const selector = feature === 'links' ? '[data-links-notice]' : '[data-circle-notice]';
  const notice = document.querySelector<HTMLElement>(selector);
  if (!notice) return;
  notice.textContent = text;
  notice.hidden = text === '';
}

function isClientConfig(value: unknown): value is YoulinClientConfig {
  if (typeof value !== 'object' || value === null) return false;
  const config = value as Record<string, unknown>;
  const messages = config.messages;
  if (typeof messages !== 'object' || messages === null) return false;
  const catalog = messages as Record<string, unknown>;

  return (
    (config.linksUrl === null || typeof config.linksUrl === 'string') &&
    (config.circleUrl === null || typeof config.circleUrl === 'string') &&
    typeof config.timeoutMs === 'number' &&
    typeof config.pageSize === 'number' &&
    ['note', 'circleSummary', 'unavailable', 'emptyLinks', 'emptyCircle'].every(
      (key) => typeof catalog[key] === 'string',
    )
  );
}

function readClientConfig(): YoulinClientConfig | null {
  const script = document.querySelector<HTMLScriptElement>('script[data-youlin-client-config]');
  if (!script?.textContent) return null;

  try {
    const parsed: unknown = JSON.parse(script.textContent);
    return isClientConfig(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function sync(): Promise<void> {
  const config = readClientConfig();
  if (!config) return;

  const page = document.querySelector<HTMLElement>('main.links-page');
  if (!page || page.dataset.youlinSynced === '1') return;
  page.dataset.youlinSynced = '1';

  try {
    const [linksResult, circleResult] = await Promise.all([
      config.linksUrl
        ? fetchYoulinJson<unknown>(config.linksUrl, { timeoutMs: config.timeoutMs })
        : null,
      config.circleUrl
        ? fetchYoulinJson<unknown>(config.circleUrl, { timeoutMs: config.timeoutMs })
        : null,
    ]);

    // View Transition 期间旧页面可能已被替换，不要往新页面写旧结果
    if (!page.isConnected) return;

    let linksFailed = false;
    let circleFailed = false;

    if (config.linksUrl) {
      if (linksResult?.ok) {
        const groups = mapYoulinLinks(linksResult.data);
        if (groups) renderFriendLinks(groups, config);
        else linksFailed = true;
      } else {
        linksFailed = true;
      }
    }

    if (config.circleUrl) {
      if (circleResult?.ok) {
        const mapped = mapYoulinCircle(circleResult.data);
        if (mapped) renderCircle(mapped.posts, mapped.stats, config);
        else circleFailed = true;
      } else {
        circleFailed = true;
      }
    }

    if (config.linksUrl) {
      showNotice('links', linksFailed ? config.messages.unavailable : '');
    }
    if (config.circleUrl) {
      showNotice('circle', circleFailed ? config.messages.unavailable : '');
    }
  } catch {
    if (config.linksUrl) showNotice('links', config.messages.unavailable);
    if (config.circleUrl) showNotice('circle', config.messages.unavailable);
  }
}

/** 由 links.astro 的页面脚本在每次 page-load 时调用；内部有幂等保护。 */
export function initYoulinClient(): void {
  void sync();
}
