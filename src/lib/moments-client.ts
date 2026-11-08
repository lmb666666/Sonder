import {
  escapeHtml,
  formatMomentRange,
  groupMomentsByMonth,
  mapEchoItem,
  momentDateInfo,
  type EchoItem,
  type MomentItem,
} from './moments';
import {
  parseMomentSongUrl,
  fetchMomentMusicTrack,
  renderMomentAudioPlayer,
  renderNeteaseOutchain,
} from './moment-music';
import { renderMomentSpecial, type MomentSpecialLabels } from './moment-special';
import { initMomentsLightbox } from './moments-lightbox';
// 复用文章指令的客户端控制器，避免第二套播放器/视频逻辑。
import { initAudioPlayers } from '../plugins/markdown/directives/widgets/audio-player';
import { applyVideoZoom } from '../plugins/markdown/directives/widgets/video';

interface MomentsMessages {
  loading: string;
  count: string;
  loadMoreCount: string;
  imageAria: string;
  moreImages: string;
  loadingMore: string;
  loadFailed: string;
  loadFailedHint: string;
  loadMoreFailed: string;
  retry: string;
  empty: string;
  extension: MomentSpecialLabels;
}

interface MomentsConfig {
  ech0: boolean;
  apiUrl: string;
  metingApi: string;
  pageSize: number;
  locale: string;
  messages: MomentsMessages;
}

interface EchoQueryResponse {
  code?: number;
  data?: {
    total?: number;
    items?: EchoItem[];
  };
}

const fill = (template: string, key: string, value: string | number): string =>
  template.replace(`{${key}}`, String(value));

function readConfig(page: HTMLElement): MomentsConfig | null {
  const script = page.querySelector<HTMLScriptElement>('script[data-moments-config]');
  if (!script?.textContent) return null;

  try {
    const parsed = JSON.parse(script.textContent) as Partial<MomentsConfig>;
    if (
      typeof parsed.ech0 !== 'boolean' ||
      typeof parsed.apiUrl !== 'string' ||
      typeof parsed.pageSize !== 'number' ||
      typeof parsed.locale !== 'string' ||
      typeof parsed.messages !== 'object' ||
      parsed.messages === null
    ) {
      return null;
    }
    return {
      ...(parsed as MomentsConfig),
      metingApi: typeof parsed.metingApi === 'string' ? parsed.metingApi : '',
    };
  } catch {
    return null;
  }
}

function renderMediaHtml(item: MomentItem, messages: MomentsMessages): string {
  const images = (item.images ?? []).slice(0, 9);
  const extra = Math.max(0, (item.images?.length ?? 0) - 9);
  let html = '';

  if (images.length > 0) {
    html += `<div class="moment-gallery" data-count="${images.length}">`;
    html += images
      .map((src, index) => {
        const overlay =
          extra > 0 && index === images.length - 1
            ? `<span class="moment-image-more">${escapeHtml(
                fill(messages.moreImages, 'count', extra),
              )}</span>`
            : '';
        return (
          `<a class="moment-image" href="${escapeHtml(src)}" data-moment-image ` +
          `aria-label="${escapeHtml(fill(messages.imageAria, 'index', index + 1))}">` +
          `<img src="${escapeHtml(src)}" alt="" loading="lazy" decoding="async" data-moment-thumb />` +
          overlay +
          `</a>`
        );
      })
      .join('');
    html += '</div>';
  }

  return html;
}

function renderEntryHtml(item: MomentItem, config: MomentsConfig): string {
  const info = momentDateInfo(item.date, config.locale);
  if (!info) return '';

  const content = item.content
    ? `<p class="moment-content">${escapeHtml(item.content.replace(/\r\n?/g, '\n')).replace(
        /\n/g,
        '<br />',
      )}</p>`
    : '';
  const tags = item.tags?.length
    ? `<footer class="moment-tags">${item.tags
        .map((tag) => `<span>#${escapeHtml(tag)}</span>`)
        .join('')}</footer>`
    : '';

  return (
    `<article class="moment" id="moment-${escapeHtml(item.id)}" data-moment>` +
    `<div class="moment-date" aria-hidden="true">` +
    `<span class="moment-day">${escapeHtml(info.day)}</span>` +
    `<span class="moment-weekday">${escapeHtml(info.weekday)}</span>` +
    `</div>` +
    `<div class="moment-body">` +
    `<p class="moment-time"><time datetime="${escapeHtml(item.date)}">${escapeHtml(info.time)}</time></p>` +
    content +
    renderMediaHtml(item, config.messages) +
    renderMomentSpecial(item, config.messages.extension) +
    tags +
    `</div></article>`
  );
}

function appendMomentGroups(list: HTMLElement, items: MomentItem[], config: MomentsConfig): void {
  const groups = groupMomentsByMonth(items, config.locale);

  for (const group of groups) {
    let section = Array.from(list.querySelectorAll<HTMLElement>('[data-month-key]')).find(
      (element) => element.dataset.monthKey === group.key,
    );

    if (!section) {
      section = document.createElement('section');
      section.className = 'moments-month';
      section.dataset.momentMonth = '';
      section.dataset.monthKey = group.key;

      const header = document.createElement('header');
      header.className = 'moments-month-head';
      const title = document.createElement('h2');
      title.textContent = group.label;
      const rule = document.createElement('span');
      rule.className = 'moments-month-rule';
      rule.setAttribute('aria-hidden', 'true');
      header.append(title, rule);

      const entries = document.createElement('ol');
      entries.className = 'moments-month-list';
      section.append(header, entries);
      list.append(section);
    }

    const entries = section.querySelector('ol');
    if (entries) {
      entries.insertAdjacentHTML(
        'beforeend',
        group.items.map((item) => renderEntryHtml(item, config)).join(''),
      );
    }
  }
}

async function fetchEchoPage(
  config: MomentsConfig,
  page: number,
): Promise<{ items: MomentItem[]; total: number }> {
  const apiUrl = config.apiUrl.replace(/\/$/, '');
  const response = await fetch(`${apiUrl}/api/echo/query`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      page,
      pageSize: config.pageSize,
      sortOrder: 'desc',
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) throw new Error(`Ech0 HTTP ${response.status}`);

  const payload = (await response.json()) as EchoQueryResponse;
  if (payload?.code !== 1 || !payload?.data) {
    throw new Error('Ech0 query failed');
  }

  const rawItems = Array.isArray(payload.data.items) ? payload.data.items : [];
  const items = rawItems
    .map((item, index) => mapEchoItem(item, apiUrl, `echo-${page}-${index}`))
    .filter((item): item is MomentItem => item !== null);
  const total = Number(payload.data.total);

  return {
    items,
    total: Number.isFinite(total) && total >= items.length ? total : items.length,
  };
}

async function initMomentMusic(page: HTMLElement, config: MomentsConfig): Promise<void> {
  if (!config.metingApi.trim()) return;

  const wrappers = Array.from(page.querySelectorAll<HTMLElement>('[data-moment-music]')).filter(
    (wrapper) => wrapper.dataset.musicReady !== '1',
  );
  if (wrappers.length === 0) return;

  await Promise.all(
    wrappers.map(async (wrapper) => {
      wrapper.dataset.musicReady = '1';
      const target = parseMomentSongUrl(wrapper.dataset.songUrl ?? '');
      if (!target) return;

      const track = await fetchMomentMusicTrack(target, config.metingApi);
      if (!track || !wrapper.isConnected) return;

      const fallback = wrapper.innerHTML;
      wrapper.innerHTML = renderMomentAudioPlayer(track);
      initAudioPlayers();

      const audio = wrapper.querySelector<HTMLAudioElement>('audio');
      if (!audio) return;
      const onError = () => {
        if (!wrapper.isConnected) return;
        wrapper.querySelector('audio')?.pause();
        wrapper.innerHTML = target.server === 'netease' ? renderNeteaseOutchain(target) : fallback;
      };
      audio.addEventListener('error', onError, { once: true });
      // <source> 加载失败时 error 派发在 source 上，不会冒泡到 audio。
      wrapper.querySelector('source')?.addEventListener('error', onError, {
        once: true,
      });
      if (audio.error) onError();
    }),
  );
}

/** 特殊内容增强：现有播放器控制器、抖音/TikTok zoom，Meting 异步替换音乐卡。 */
function enhanceMoments(page: HTMLElement, config: MomentsConfig): void {
  initAudioPlayers();
  applyVideoZoom();
  void initMomentMusic(page, config).catch(() => undefined);
}

function bootStatic(page: HTMLElement, list: HTMLElement, config: MomentsConfig): void {
  const entries = Array.from(list.querySelectorAll<HTMLElement>('[data-moment]'));
  const months = Array.from(list.querySelectorAll<HTMLElement>('[data-moment-month]'));
  const actions = page.querySelector<HTMLElement>('[data-moments-actions]');
  const more = page.querySelector<HTMLButtonElement>('[data-moments-more]');
  let visible = entries.filter((entry) => !entry.classList.contains('is-hidden')).length;

  const update = () => {
    entries.forEach((entry, index) => {
      entry.classList.toggle('is-hidden', index >= visible);
    });
    months.forEach((month) => {
      const monthEntries = Array.from(month.querySelectorAll<HTMLElement>('[data-moment]'));
      month.classList.toggle(
        'is-hidden',
        monthEntries.every((entry) => entry.classList.contains('is-hidden')),
      );
    });

    const remaining = Math.max(0, entries.length - visible);
    if (more) {
      more.hidden = remaining <= 0;
      more.textContent = fill(config.messages.loadMoreCount, 'count', remaining);
    }
    if (actions) actions.hidden = remaining <= 0;
    // 静态分页隐藏期间抖音容器宽度为 0，展开后需重新计算 zoom。
    applyVideoZoom();
  };

  update();

  more?.addEventListener('click', () => {
    visible = Math.min(entries.length, visible + config.pageSize);
    update();
  });
}

function bootEch0(page: HTMLElement, list: HTMLElement, config: MomentsConfig): void {
  const stats = page.querySelector<HTMLElement>('[data-moments-stats]');
  const skeleton = page.querySelector<HTMLElement>('[data-moments-skeleton]');
  const empty = page.querySelector<HTMLElement>('[data-moments-empty]');
  const error = page.querySelector<HTMLElement>('[data-moments-error]');
  const errorText = page.querySelector<HTMLElement>('[data-moments-error-text]');
  const retry = page.querySelector<HTMLButtonElement>('[data-moments-retry]');
  const actions = page.querySelector<HTMLElement>('[data-moments-actions]');
  const more = page.querySelector<HTMLButtonElement>('[data-moments-more]');
  const moreError = page.querySelector<HTMLElement>('[data-moments-more-error]');
  const moreRetry = page.querySelector<HTMLButtonElement>('[data-moments-more-retry]');

  const state = {
    page: 1,
    total: 0,
    loaded: 0,
    items: [] as MomentItem[],
    fetching: false,
  };

  const setHidden = (element: HTMLElement | null, hidden: boolean) => {
    if (element) element.hidden = hidden;
  };

  const setStats = () => {
    if (!stats) return;
    const range = formatMomentRange(state.items);
    const count = fill(config.messages.count, 'count', state.total);
    stats.textContent = range ? `${count} · ${range}` : count;
  };

  const updateMore = () => {
    const remaining = Math.max(0, state.total - state.loaded);
    if (more) {
      more.hidden = remaining <= 0;
      more.disabled = state.fetching;
      more.textContent = state.fetching
        ? config.messages.loadingMore
        : fill(config.messages.loadMoreCount, 'count', remaining);
    }
    if (actions) actions.hidden = remaining <= 0;
  };

  const showError = (message: string) => {
    if (errorText) errorText.textContent = message;
    setHidden(error, false);
  };

  const hideError = () => setHidden(error, true);
  const hideMoreError = () => setHidden(moreError, true);

  const finishInitial = (data: { items: MomentItem[]; total: number }) => {
    state.total = data.total;
    state.page = 1;
    state.loaded = data.items.length;
    state.items = [...data.items];
    skeleton?.remove();
    hideError();
    appendMomentGroups(list, data.items, config);
    setStats();
    updateMore();
    if (state.total === 0) setHidden(empty, false);
    void enhanceMoments(page, config);
  };

  const loadInitial = async () => {
    setHidden(empty, true);
    hideError();
    hideMoreError();
    if (stats) stats.textContent = config.messages.loading;

    try {
      const data = await fetchEchoPage(config, 1);
      finishInitial(data);
    } catch (error) {
      console.error('[moments] Ech0 拉取失败：', error);
      skeleton?.remove();
      if (stats) stats.textContent = config.messages.loadFailedHint;
      showError(config.messages.loadFailed);
    }
  };

  const loadMore = async () => {
    if (state.fetching) return;

    const nextPage = state.page + 1;
    state.fetching = true;
    hideMoreError();
    updateMore();

    try {
      const data = await fetchEchoPage(config, nextPage);
      if (data.items.length === 0) {
        state.total = state.loaded;
        setStats();
        return;
      }

      state.page = nextPage;
      state.total = data.total;
      state.items.push(...data.items);
      state.loaded += data.items.length;
      appendMomentGroups(list, data.items, config);
      setStats();
      void enhanceMoments(page, config);
    } catch (error) {
      console.error('[moments] 加载更多失败：', error);
      setHidden(moreError, false);
    } finally {
      state.fetching = false;
      updateMore();
    }
  };

  more?.addEventListener('click', () => void loadMore());
  moreRetry?.addEventListener('click', () => void loadMore());
  retry?.addEventListener('click', () => void loadInitial());

  void loadInitial();
}

/** 页面脚本在每次 astro:page-load 时调用；内部按页面 DOM 幂等。 */
export function initMoments(): void {
  const page = document.querySelector<HTMLElement>('[data-moments-page]');
  if (!page) return;

  const list = page.querySelector<HTMLElement>('[data-moments-list]');
  const config = readConfig(page);
  if (!list || !config) return;
  if (page.dataset.momentsBooted === '1') return;
  page.dataset.momentsBooted = '1';

  if (!config.ech0) {
    bootStatic(page, list, config);
    void enhanceMoments(page, config);
  } else {
    bootEch0(page, list, config);
  }

  initMomentsLightbox();
}
