/** 朋友圈：按 data-friend-circle-data 洗牌渲染（对应 ::friend-circle 指令输出）。 */

type Post = {
  title?: string;
  url?: string;
  date?: string;
  tags?: string[];
  author?: string;
  authorUrl?: string;
  avatar?: string;
};

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character] ?? character,
  );

const shuffle = <T>(items: T[]) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
};

const render = (root: HTMLElement, posts: Post[]) => {
  const target = root.querySelector<HTMLElement>('[data-friend-circle-posts]');
  if (!target) return;
  target.innerHTML = posts
    .map((post) => {
      const author = post.author ?? '?';
      const avatar = post.avatar
        ? `<img src="${escape(post.avatar)}" alt="" loading="lazy" decoding="async">`
        : `<span>${escape((author[0] || '?').toUpperCase())}</span>`;
      const tags = (post.tags ?? [])
        .slice(0, 3)
        .map((tag) => `<span>${escape(tag)}</span>`)
        .join('');
      return `<article class="friend-circle__post"><a class="friend-circle__author-link" href="${escape(post.authorUrl || post.url || '#')}" target="_blank" rel="noopener noreferrer"><span class="friend-circle__author-avatar" aria-hidden="true">${avatar}</span><span class="friend-circle__author">${escape(author)}</span></a><a class="friend-circle__post-title" href="${escape(post.url || '#')}" target="_blank" rel="noopener noreferrer">${escape(post.title ?? '')}</a><span class="friend-circle__post-meta">${tags ? `<span class="friend-circle__tags">${tags}</span>` : ''}${post.date ? `<time>${escape(post.date)}</time>` : ''}</span></article>`;
    })
    .join('');
};

export function initFriendCircles() {
  document.querySelectorAll<HTMLElement>('[data-friend-circle]').forEach((root) => {
    if (root.dataset.initialized) return;
    root.dataset.initialized = 'true';
    const data = root.querySelector<HTMLScriptElement>('[data-friend-circle-data]');
    if (!data?.textContent) return;
    const { posts, initialPosts } = JSON.parse(data.textContent) as {
      posts: Post[];
      initialPosts: Post[];
    };
    const limit = Number(root.dataset.limit) || 10;
    render(root, initialPosts);
    root
      .querySelector<HTMLButtonElement>('[data-friend-circle-refresh]')
      ?.addEventListener('click', (event) => {
        const button = event.currentTarget as HTMLButtonElement;
        button.classList.add('is-refreshing');
        render(root, shuffle(posts).slice(0, limit));
        window.setTimeout(() => button.classList.remove('is-refreshing'), 260);
      });
  });
}
