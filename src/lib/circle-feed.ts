import { bindCircleMore } from './circle-more';

interface CircleFeedConfig {
  src: string;
  pageSize: number;
  messages: {
    summary: string;
    loading: string;
    empty: string;
    loadMore: string;
    error: string;
  };
}

interface CirclePost {
  title: string;
  url: string;
  author: string;
  authorUrl: string;
  date: string;
  avatar: string;
  tags: string[];
}

interface CircleData {
  posts: CirclePost[];
  friends: number;
  active: number;
  total: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );

function safeUrl(value: string) {
  if (!value) return '';
  try {
    const url = new URL(value, window.location.href);
    return /^https?:$/.test(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

function safeImage(value: string) {
  if (!value) return '';
  if (value.startsWith('/')) return value;
  return safeUrl(value);
}

function normalizePosts(data: unknown): CircleData {
  if (!isRecord(data)) return { posts: [], friends: 0, active: 0, total: 0 };

  const rawPosts = Array.isArray(data.article_data)
    ? data.article_data
    : Array.isArray(data.posts)
      ? data.posts
      : [];
  const stats = isRecord(data.statistical_data) ? data.statistical_data : {};
  const rawFriends = Array.isArray(data.friends) ? data.friends : [];

  const posts = rawPosts.flatMap((value): CirclePost[] => {
    if (!isRecord(value)) return [];
    const url = safeUrl(text(value.link) || text(value.url));
    const title = text(value.title);
    const author = text(value.author) || text(value.name);
    if (!url || !title || !author) return [];

    const tags = Array.isArray(value.tags)
      ? value.tags.map((tag) => text(tag)).filter(Boolean)
      : [];

    return [
      {
        title,
        url,
        author,
        authorUrl: safeUrl(text(value.authorUrl)),
        date: text(value.created) || text(value.date),
        avatar: safeImage(text(value.avatar)),
        tags,
      },
    ];
  });

  const active = new Set(posts.map((post) => post.author)).size;
  return {
    posts,
    friends: Number(stats.friends_num) || rawFriends.length || active,
    active: Number(stats.active_num) || active,
    total: Number(stats.article_num) || posts.length,
  };
}

function formatSummary(template: string, data: CircleData) {
  return template
    .replace('{friends}', String(data.friends))
    .replace('{active}', String(data.active))
    .replace('{posts}', String(data.total));
}

function renderPost(post: CirclePost, index: number, pageSize: number) {
  const date = post.date ? post.date.slice(0, 10) : '';
  const avatar = post.avatar
    ? `<img src="${escapeHtml(post.avatar)}" alt="" loading="lazy" decoding="async" />`
    : `<span>${escapeHtml((post.author[0] || '?').toUpperCase())}</span>`;
  const tags = post.tags.length
    ? `<span class="circle-card__tags">${post.tags
        .slice(0, 3)
        .map((tag) => `<span>#${escapeHtml(tag)}</span>`)
        .join('')}</span>`
    : '';

  return `<article class="circle-card${index >= pageSize ? ' circle-card--hidden' : ''}" data-circle-card>
    <a class="circle-card__author" href="${escapeHtml(post.authorUrl || post.url)}" target="_blank" rel="noopener noreferrer">
      <span class="circle-card__avatar" aria-hidden="true">${avatar}</span>
      <span class="circle-card__name">${escapeHtml(post.author)}</span>
    </a>
    <a class="circle-card__title" href="${escapeHtml(post.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(post.title)}</a>
    <footer class="circle-card__meta">${tags}${date ? `<time datetime="${escapeHtml(date)}">${escapeHtml(date)}</time>` : ''}</footer>
  </article>`;
}

export function initCircleFeed(): void {
  const configElement = document.querySelector<HTMLScriptElement>(
    'script[data-circle-feed-config]',
  );
  if (!configElement || configElement.dataset.circleFeedReady === '1') return;
  configElement.dataset.circleFeedReady = '1';

  let config: CircleFeedConfig;
  try {
    config = JSON.parse(configElement.textContent ?? '') as CircleFeedConfig;
  } catch {
    return;
  }

  const list = document.querySelector<HTMLElement>('[data-circle-list]');
  const summary = document.querySelector<HTMLElement>('[data-circle-summary]');
  const empty = document.querySelector<HTMLElement>('[data-circle-empty]');
  if (!list || !summary || !config.src) return;

  summary.textContent = config.messages.loading;
  list.setAttribute('aria-busy', 'true');

  void fetch(config.src, { headers: { accept: 'application/json' } })
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return normalizePosts(await response.json());
    })
    .then((data) => {
      list.removeAttribute('aria-busy');
      list.innerHTML = data.posts
        .map((post, index) => renderPost(post, index, config.pageSize))
        .join('');
      summary.textContent = formatSummary(config.messages.summary, data);
      if (empty) empty.hidden = data.posts.length > 0;
      bindCircleMore();
    })
    .catch((error: unknown) => {
      list.removeAttribute('aria-busy');
      summary.textContent = config.messages.error;
      list.innerHTML = `<p class="links-empty">${escapeHtml(config.messages.error)}</p>`;
      console.error('[circle] 朋友圈数据加载失败：', error);
    });
}
