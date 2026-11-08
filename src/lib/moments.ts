export type MomentVideoProvider = 'bilibili' | 'youtube' | 'douyin' | 'tiktok';

export type MomentExtensionType = 'github' | 'website' | 'music' | 'location' | 'tweet';

export interface MomentExtension {
  type: MomentExtensionType;
  title: string;
  description?: string;
  url?: string;
}

export interface MomentVideo {
  provider: MomentVideoProvider;
  id: string;
}

export interface MomentVideoEmbed {
  kind: 'embed' | 'video';
  provider: MomentVideoProvider;
  src: string;
  ratio?: string;
  zoom?: number;
}

export interface MomentItem {
  id: string;
  content: string;
  /** ISO 日期 */
  date: string;
  tags?: string[];
  images?: string[];
  video?: MomentVideo;
  extension?: MomentExtension;
}

export interface MomentDateInfo {
  day: string;
  weekday: string;
  time: string;
  monthKey: string;
  monthLabel: string;
}

export interface MomentMonthGroup {
  key: string;
  label: string;
  items: MomentItem[];
}

export interface EchoFile {
  url?: string;
  sort_order?: number;
  content_type?: string;
  category?: string;
  file?: {
    url?: string;
    name?: string;
    content_type?: string;
    category?: string;
    width?: number;
    height?: number;
  };
}

export interface EchoExtension {
  type?: string;
  payload?: Record<string, unknown> | null;
}

export interface EchoItem {
  id?: string | number;
  content?: string;
  created_at?: number;
  tags?: { name?: string }[];
  echo_files?: EchoFile[];
  extension?: EchoExtension;
}

const BILIBILI_ID = /^BV[\da-z]{10}$/i;
const YOUTUBE_ID = /^[\w-]{11}$/;
const YOUTUBE_URL = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/i;
const DOUYIN_URL = /douyin\.com\/video\/(\d{6,})/i;
const TIKTOK_URL = /tiktok\.com\/(?:@[^/]+\/video\/|embed\/v3\/)(\d{6,})/i;
const CJK_LOCALE = /^zh(?:-|$)/i;

const pad = (value: number) => String(value).padStart(2, '0');

const isoDate = (value: string | Date): Date | null => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
};

/** 月标题：中文用「2026 年 10 月」，其他语言走 Intl 的「October 2026」。 */
export function momentDateInfo(value: string | Date, locale: string): MomentDateInfo | null {
  const date = isoDate(value);
  if (!date) return null;

  const month = date.getMonth() + 1;
  const monthLabel = CJK_LOCALE.test(locale)
    ? `${date.getFullYear()} 年 ${month} 月`
    : `${new Intl.DateTimeFormat(locale, { month: 'long' }).format(date)} ${date.getFullYear()}`;

  return {
    day: pad(date.getDate()),
    weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date),
    time: new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date),
    monthKey: `${date.getFullYear()}-${pad(month)}`,
    monthLabel,
  };
}

/** 保持输入顺序（Ech0 与演示数据都是倒序），非法日期直接跳过。 */
export function groupMomentsByMonth(items: MomentItem[], locale: string): MomentMonthGroup[] {
  const groups: MomentMonthGroup[] = [];
  const byKey = new Map<string, MomentMonthGroup>();

  for (const item of items) {
    const info = momentDateInfo(item.date, locale);
    if (!info) continue;

    let group = byKey.get(info.monthKey);
    if (!group) {
      group = { key: info.monthKey, label: info.monthLabel, items: [] };
      byKey.set(info.monthKey, group);
      groups.push(group);
    }
    group.items.push(item);
  }

  return groups;
}

/** 已加载动态的时间范围，例如「2026.08 — 2026.10」。 */
export function formatMomentRange(items: MomentItem[]): string {
  const times = items
    .map((item) => isoDate(item.date)?.getTime())
    .filter((value): value is number => typeof value === 'number');

  if (times.length === 0) return '';

  const first = new Date(Math.min(...times));
  const last = new Date(Math.max(...times));
  const format = (date: Date) => `${date.getFullYear()}.${pad(date.getMonth() + 1)}`;
  const start = format(first);
  const end = format(last);
  return start === end ? start : `${start} — ${end}`;
}

export function momentVideoEmbed(video: MomentVideo): MomentVideoEmbed | undefined {
  if (video.provider === 'bilibili' && BILIBILI_ID.test(video.id)) {
    return {
      kind: 'embed',
      provider: 'bilibili',
      src: `https://player.bilibili.com/player.html?bvid=${video.id}&autoplay=0&danmaku=0`,
    };
  }
  if (video.provider === 'youtube' && YOUTUBE_ID.test(video.id)) {
    return {
      kind: 'embed',
      provider: 'youtube',
      src: `https://www.youtube-nocookie.com/embed/${video.id}`,
    };
  }
  if (video.provider === 'douyin' && /^\d{6,}$/.test(video.id)) {
    return {
      kind: 'video',
      provider: 'douyin',
      src: `https://open.douyin.com/player/video?vid=${video.id}`,
      ratio: '27 / 56',
      zoom: 0.0031,
    };
  }
  if (video.provider === 'tiktok' && /^\d{6,}$/.test(video.id)) {
    return {
      kind: 'video',
      provider: 'tiktok',
      src: `https://www.tiktok.com/embed/v3/${video.id}`,
      ratio: '16 / 9',
    };
  }
  return undefined;
}

export function detectVideo(value: unknown): MomentVideo | undefined {
  if (typeof value !== 'string') return undefined;
  const raw = value.trim();
  if (!raw) return undefined;
  if (BILIBILI_ID.test(raw)) return { provider: 'bilibili', id: raw };

  const bilibili = raw.match(/(?:^|\/)(BV[\da-z]{10})(?:[/?#]|$)/i);
  if (bilibili) return { provider: 'bilibili', id: bilibili[1] };

  const youtube = raw.match(YOUTUBE_URL);
  if (youtube) return { provider: 'youtube', id: youtube[1] };
  if (YOUTUBE_ID.test(raw)) return { provider: 'youtube', id: raw };

  const douyin = raw.match(DOUYIN_URL);
  if (douyin) return { provider: 'douyin', id: douyin[1] };

  const tiktok = raw.match(TIKTOK_URL);
  if (tiktok) return { provider: 'tiktok', id: tiktok[1] };

  return undefined;
}

export function safeExternalUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const raw = value.trim();
  if (!raw) return '';

  if (raw.startsWith('/') && !raw.startsWith('//')) return '';

  const candidate = /^\/\//.test(raw)
    ? `https:${raw}`
    : /^[a-z][a-z\d+.-]*:/i.test(raw)
      ? raw
      : `https://${raw}`;

  try {
    const url = new URL(candidate);
    if (!/^https?:$/.test(url.protocol)) return '';
    if (url.username || url.password) return '';
    return url.toString();
  } catch {
    return '';
  }
}

export function resolveEchoImageUrl(value: unknown, apiUrl: string): string {
  if (typeof value !== 'string') return '';
  const raw = value.trim();
  if (!raw) return '';

  if (raw.startsWith('/') && !raw.startsWith('//')) {
    const base = apiUrl.replace(/\/$/, '');
    return base ? safeExternalUrl(`${base}${raw}`) : '';
  }
  return safeExternalUrl(raw);
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char] as string,
  );
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const firstText = (...values: unknown[]): string => values.map(text).find(Boolean) ?? '';

const echoNumber = (value: unknown): number | undefined => {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function domainOf(url: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function musicPlatformName(url: string): string {
  const host = domainOf(url);
  if (!host) return '';
  if (host === 'music.163.com' || host === '163.com') return '网易云音乐';
  if (host === 'y.qq.com' || host === 'qq.com') return 'QQ 音乐';
  if (host === 'kugou.com' || host.endsWith('.kugou.com')) return '酷狗音乐';
  if (host === 'spotify.com' || host.endsWith('.spotify.com')) return 'Spotify';
  if (host === 'soundcloud.com' || host.endsWith('.soundcloud.com')) return 'SoundCloud';
  return host;
}

export function githubOwner(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (!/(^|\.)github\.com$/i.test(parsed.hostname)) return '';
    return parsed.pathname.split('/').filter(Boolean)[0] ?? '';
  } catch {
    return '';
  }
}

const githubRepoFromUrl = (url: string): string => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (!/(^|\.)github\.com$/i.test(parsed.hostname)) return '';
    const [owner, repo] = parsed.pathname.split('/').filter(Boolean);
    return owner && repo ? `${owner}/${repo.replace(/\.git$/i, '')}` : '';
  } catch {
    return '';
  }
};

const githubProjectTitle = (payload: Record<string, unknown>, url: string): string => {
  const fullName = firstText(payload.full_name, payload.fullName);
  if (fullName) return fullName;

  const owner = firstText(payload.owner, payload.user);
  const repo = firstText(payload.repo, payload.repository);
  if (owner && repo) return `${owner}/${repo}`;

  return (
    githubRepoFromUrl(url) ||
    firstText(payload.title, payload.name) ||
    (url ? new URL(url).hostname : '')
  );
};

const githubProjectUrl = (payload: Record<string, unknown>, title: string): string => {
  const raw = firstText(payload.url, payload.repoUrl, payload.link, payload.href, payload.site);
  if (raw) return safeExternalUrl(raw);
  return title.includes('/') ? safeExternalUrl(`https://github.com/${title}`) : '';
};

const extensionFromEcho = (
  rawType: string,
  payload: Record<string, unknown>,
): MomentExtension | undefined => {
  const type = rawType.toUpperCase();

  if (type === 'GITHUBPROJ') {
    const explicitTitle = githubProjectTitle(payload, '');
    const url = githubProjectUrl(payload, explicitTitle);
    const title = explicitTitle || githubRepoFromUrl(url);
    const description = firstText(payload.description, payload.desc);
    if (!title && !url) return undefined;
    return {
      type: 'github',
      title: title || new URL(url).hostname,
      description: description || url || undefined,
      url: url || undefined,
    };
  }

  if (type === 'MUSIC') {
    const title = firstText(payload.title, payload.name, payload.song);
    const url = safeExternalUrl(firstText(payload.url, payload.link, payload.href));
    const description = firstText(
      payload.artist,
      payload.artistName,
      payload.description,
      payload.desc,
    );
    if (!title && !url) return undefined;
    return {
      type: 'music',
      // 只有链接时用平台名兜底；播放器解析成功后会用真实曲名/作者替换。
      title: title || description || musicPlatformName(url),
      description: description || undefined,
      url: url || undefined,
    };
  }

  if (type === 'LOCATION') {
    const title = firstText(payload.placeholder, payload.address, payload.name, payload.title);
    const latitude = echoNumber(payload.latitude);
    const longitude = echoNumber(payload.longitude);
    const coordinates =
      latitude !== undefined && longitude !== undefined
        ? `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`
        : '';
    if (!title && !coordinates) return undefined;

    const url =
      latitude !== undefined && longitude !== undefined
        ? safeExternalUrl(
            `https://uri.amap.com/marker?position=${longitude},${latitude}&name=${encodeURIComponent(
              title || `${latitude},${longitude}`,
            )}&coordinate=wgs84&callnative=0`,
          )
        : '';

    return {
      type: 'location',
      title: title || coordinates,
      description: coordinates || undefined,
      url: url || undefined,
    };
  }

  if (type === 'TWEET') {
    const title = firstText(payload.title, payload.text, payload.content);
    const url = safeExternalUrl(firstText(payload.url, payload.link, payload.href));
    const username = firstText(payload.username, payload.author).replace(/^@+/, '');
    const description = username
      ? `@${username}`
      : firstText(payload.description, payload.desc) || url;
    if (!title && !url) return undefined;
    return {
      type: 'tweet',
      title: title.slice(0, 90) || description || 'Tweet',
      description: description || undefined,
      url: url || undefined,
    };
  }

  const url = safeExternalUrl(firstText(payload.url, payload.link, payload.href, payload.site));
  const title = firstText(payload.title, payload.name, payload.site);
  const description = firstText(payload.description, payload.desc);
  if (!title && !url) return undefined;
  return {
    type: 'website',
    title: title || new URL(url).hostname,
    description: description || domainOf(url) || undefined,
    url: url || undefined,
  };
};

const isEchoImage = (file: EchoFile): boolean => {
  const url = firstText(file.file?.url, file.url);
  if (!url) return false;

  const contentType = firstText(file.file?.content_type, file.content_type);
  const category = firstText(file.file?.category, file.category);
  return (
    category === 'image' ||
    contentType.startsWith('image/') ||
    /\.(?:avif|gif|jpe?g|png|webp)(?:[?#].*)?$/i.test(url)
  );
};

const echoImages = (item: EchoItem, apiUrl: string): string[] => {
  const urls = (item.echo_files ?? [])
    .filter(isEchoImage)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((file) => resolveEchoImageUrl(firstText(file.file?.url, file.url), apiUrl))
    .filter(Boolean);

  return [...new Set(urls)];
};

/** Ech0 条目 → 页面视图模型；缺少创建时间或 id 时返回 null。 */
export function mapEchoItem(item: EchoItem, apiUrl: string, fallbackId = ''): MomentItem | null {
  const createdAt = Number(item.created_at);
  if (!Number.isFinite(createdAt) || createdAt <= 0) return null;

  const id = typeof item.id === 'number' ? String(item.id) : firstText(item.id, fallbackId);
  if (!id) return null;

  const payload =
    item.extension?.payload && typeof item.extension.payload === 'object'
      ? item.extension.payload
      : {};
  const rawType = firstText(item.extension?.type);
  const video =
    rawType.toUpperCase() === 'VIDEO'
      ? detectVideo(firstText(payload.videoId, payload.bvid, payload.url, payload.id))
      : undefined;

  const extension =
    rawType && rawType.toUpperCase() !== 'VIDEO' ? extensionFromEcho(rawType, payload) : undefined;

  return {
    id,
    content: typeof item.content === 'string' ? item.content.trim() : '',
    date: new Date(createdAt * 1000).toISOString(),
    tags: (item.tags ?? []).map((tag) => text(tag?.name)).filter(Boolean),
    images: echoImages(item, apiUrl),
    video,
    extension,
  };
}
