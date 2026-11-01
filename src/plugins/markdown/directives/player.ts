import { h } from 'hastscript';
import { musicThemeStyle, type MusicThemeName } from './music-theme.js';
import type { AttributeValue, MdastNode } from './handlers.js';
import { wrapHast } from './handlers.js';
import { icon } from './icons.js';

/**
 * 音乐播放器的指令渲染：构建期输出与 MusicPlayer.astro 逐类名一致的 HTML。
 * - `::music-player{provider="…" url="…"}` → 官方 embed 模式
 * - `::netease{id="…"}`（type 缺省或 playlist）→ Meting 解析歌单 → 原生播放器
 *   解析失败降级为链接卡片；type=song/album/radio 仍走 outchain iframe（embedHandler）。
 */

type HastLike = ReturnType<typeof h>;

export interface MusicTrack {
  title: string;
  artist?: string;
  artwork?: string;
  src: string;
  caption?: string;
}

export interface MusicPlayerOptions {
  title: string;
  artist?: string;
  artwork?: string;
  caption?: string;
  playlist?: MusicTrack[];
  size?: string;
  theme?: MusicThemeName;
  provider?: string;
  providerName?: string;
  embedUrl?: string;
  url?: string;
}

function asString(value: AttributeValue | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

const SIZES = new Set(['narrow', 'compact', 'normal', 'wide', 'full']);

/** 复刻 MusicPlayer.astro 的 DOM（含原生控件 / embed 两种形态） */
export function buildMusicPlayerNode(options: MusicPlayerOptions): MdastNode {
  const {
    title,
    artist,
    artwork,
    caption,
    playlist = [],
    size = 'normal',
    theme = 'system',
    provider,
    providerName,
    embedUrl,
    url,
  } = options;

  const initialTrack = playlist[0];
  const directSources = initialTrack ? [initialTrack.src] : [];
  const isNative = directSources.length > 0;
  const embed = !isNative ? embedUrl : undefined;
  const resolvedTitle = initialTrack?.title ?? title;
  const resolvedArtist = initialTrack?.artist ?? artist;
  const resolvedArtwork = initialTrack?.artwork ?? artwork;
  const resolvedCaption = initialTrack?.caption ?? caption;

  const body: HastLike[] = [
    resolvedArtwork
      ? h('img', {
          class: 'sonder-music-player__artwork',
          src: resolvedArtwork,
          alt: `《${resolvedTitle}》封面`,
          loading: 'lazy',
          decoding: 'async',
          'data-artwork': '',
        })
      : h(
          'div',
          {
            class: 'sonder-music-player__artwork sonder-music-player__artwork--placeholder',
            'aria-hidden': 'true',
          },
          [h('span', ['♫'])],
        ),
  ];

  const meta = h(
    'div',
    { class: 'sonder-music-player__meta' },
    [
      h('strong', { 'data-title': '', 'data-marquee': '' }, [h('span', [resolvedTitle])]),
      resolvedArtist
        ? h('span', { 'data-artist': '', 'data-marquee': '' }, [h('span', [resolvedArtist])])
        : undefined,
    ].filter(Boolean),
  );

  const contentChildren: HastLike[] = [meta];

  if (isNative) {
    contentChildren.push(
      h('div', { class: 'sonder-music-player__controls' }, [
        h(
          'button',
          {
            type: 'button',
            class: 'sonder-music-player__play',
            'aria-label': `播放 ${resolvedTitle}`,
            'data-play': '',
          },
          [
            {
              ...icon('play', 16),
              properties: { ...icon('play', 16).properties, 'data-play-icon': '' },
            },
            {
              ...icon('pause', 16),
              properties: { ...icon('pause', 16).properties, 'data-pause-icon': '' },
            },
          ],
        ),
        h('input', {
          class: 'sonder-music-player__progress',
          type: 'range',
          min: '0',
          max: '0',
          value: '0',
          'aria-label': `${resolvedTitle} 播放进度`,
          'data-progress': '',
        }),
        h('span', { class: 'sonder-music-player__time', 'aria-live': 'off', 'data-time': '' }, [
          '0:00',
        ]),
        h(
          'button',
          {
            type: 'button',
            class: 'sonder-music-player__mute',
            'aria-label': '静音',
            'data-mute': '',
          },
          [
            {
              ...icon('volume', 16),
              properties: { ...icon('volume', 16).properties, 'data-volume-icon': '' },
            },
            {
              ...icon('volume-x', 16),
              properties: { ...icon('volume-x', 16).properties, 'data-muted-icon': '' },
            },
          ],
        ),
        h('audio', { preload: 'metadata', 'data-audio': '' }, [
          h('source', { src: directSources[0] }),
          '你的浏览器不支持音频播放。',
        ]),
      ]),
    );
  } else if (embed) {
    contentChildren.push(
      h(
        'div',
        { class: 'sonder-music-player__provider' },
        [
          h('span', [`${providerName ?? '官方'} 官方播放器`]),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noreferrer' }, [
                '前往平台',
                icon('external-link', 14),
              ])
            : undefined,
        ].filter(Boolean),
      ),
    );
  } else {
    contentChildren.push(
      h('p', { class: 'sonder-music-player__unavailable' }, ['未能生成可用的官方播放器地址。']),
    );
  }

  body.push(h('div', { class: 'sonder-music-player__content' }, contentChildren));

  const children: HastLike[] = [h('div', { class: 'sonder-music-player__body' }, body)];

  if (embed) {
    children.push(
      h('iframe', {
        class: 'sonder-music-player__embed',
        src: embed,
        title: `${title} — ${providerName ?? ''} 播放器`,
        loading: 'lazy',
        allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',
        referrerpolicy: 'strict-origin-when-cross-origin',
      }),
    );
  }

  // 单曲不显示歌单折叠区，仅多曲目时展开
  if (playlist.length > 1 && isNative) {
    children.push(
      h('details', { class: 'sonder-music-player__playlist' }, [
        h('summary', [icon('list-music', 14), ` 歌单 · ${playlist.length}`]),
        h(
          'div',
          playlist.map((track, index) =>
            h(
              'button',
              { type: 'button', 'data-track-index': String(index) },
              [
                h('span', [track.title]),
                track.artist ? h('small', [track.artist]) : undefined,
              ].filter(Boolean),
            ),
          ),
        ),
      ]),
    );
  }

  if (playlist.length > 0) {
    const payload = JSON.stringify(playlist).replace(/</g, '\\u003c');
    children.push(h('script', { type: 'application/json', 'data-playlist': '' }, [payload]));
  }

  if (resolvedCaption) {
    children.push(
      h('figcaption', { 'data-caption': '', 'data-marquee': '' }, [h('span', [resolvedCaption])]),
    );
  }

  const sizeClass = SIZES.has(size) ? size : 'normal';
  const figure = h(
    'figure',
    {
      class: `sonder-music-player sonder-music-player--card sonder-music-player--${sizeClass}`,
      style: musicThemeStyle(theme),
      'data-sonder-music-player': '',
    },
    children,
  );
  return wrapHast('figure', figure as never);
}

// ─── Meting（网易云歌单 → 曲目清单） ─────────────────────

export type MetingTrack = MusicTrack;

const metingCache = new Map<string, MetingTrack[]>();
const metingPending = new Map<string, Promise<MetingTrack[]>>();

function parseMetingTracks(data: unknown): MetingTrack[] {
  const list = Array.isArray(data)
    ? data
    : Array.isArray((data as { playlist?: unknown[] })?.playlist)
      ? (data as { playlist: unknown[] }).playlist
      : [];
  const artistText = (value: unknown): string =>
    Array.isArray(value)
      ? value
          .map((entry) => (typeof entry === 'string' ? entry : ''))
          .filter(Boolean)
          .join(' / ')
      : typeof value === 'string'
        ? value
        : '';

  return list
    .map((entry) => {
      const track = entry as {
        name?: unknown;
        title?: unknown;
        artist?: unknown;
        artistes?: unknown;
        url?: unknown;
        pic?: unknown;
        cover?: unknown;
      };
      const name = String(track.title ?? track.name ?? '').trim();
      const src = String(track.url ?? '').trim();
      if (!name || !src) return undefined;
      return {
        title: name,
        artist: artistText(track.artist ?? track.artistes) || undefined,
        artwork: String(track.pic ?? track.cover ?? '').trim() || undefined,
        src,
      };
    })
    .filter((track): track is MetingTrack => Boolean(track));
}

/** 构建期解析网易云曲目/歌单（带模块级缓存，构建从不失败）。 */
export function fetchMetingTracks(
  id: string,
  type: NeteaseMetingType = 'playlist',
  template = '',
): Promise<MetingTrack[]> {
  const cacheKey = `${template}|${type}:${id}`;
  const cached = metingCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  const pending = metingPending.get(cacheKey);
  if (pending) return pending;

  const task = (async () => {
    if (!template) return [];
    const endpoint = template
      .replace(/:server/g, 'netease')
      .replace(/:type/g, type)
      .replace(/:id/g, id)
      .replace(/:r/g, String(Math.random()));
    try {
      const response = await fetch(endpoint, {
        signal: AbortSignal.timeout(10_000),
        headers: { accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const tracks = parseMetingTracks(JSON.parse(await response.text()));
      if (!tracks.length) throw new Error('empty playlist');
      metingCache.set(cacheKey, tracks);
      return tracks;
    } catch (error) {
      console.warn(
        `[sonder-directives] Meting ${type} ${id} 解析失败：${error instanceof Error ? error.message : error}`,
      );
      metingCache.set(cacheKey, []);
      return [];
    } finally {
      metingPending.delete(cacheKey);
    }
  })();
  metingPending.set(cacheKey, task);
  return task;
}

// ─── ::netease（默认 Meting → 原生播放器，失败降级官方外链） ──

export type NeteaseType = 'song' | 'playlist' | 'album' | 'radio';
/** Meting 支持的类型（radio 无对应解析，直接走官方外链） */
export type NeteaseMetingType = 'song' | 'playlist' | 'album';

const NETEASE_PATH_TYPES: Record<string, NeteaseType> = {
  song: 'song',
  playlist: 'playlist',
  album: 'album',
  program: 'radio',
};

const NETEASE_OUTCHAIN: Record<NeteaseType, { type: string; height: string }> = {
  song: { type: '2', height: '86' },
  playlist: { type: '0', height: '450' },
  album: { type: '10', height: '430' },
  radio: { type: '19', height: '330' },
};

/** 从 music.163.com 链接识别类型与 ID（兼容 /#/song?id=… 旧式 hash 路由） */
export function parseNeteaseUrl(value: string): { type: NeteaseType; id: string } | undefined {
  try {
    const parsed = new URL(value);
    if (!/(^|\.)music\.163\.com$/i.test(parsed.hostname)) return undefined;
    const source = parsed.hash.startsWith('#/')
      ? parsed.hash.slice(1)
      : `${parsed.pathname}${parsed.search}`;
    const [path, query = ''] = source.split('?');
    const id = new URLSearchParams(query).get('id') ?? '';
    const segment = path.split('/').filter(Boolean)[0] ?? '';
    const type = NETEASE_PATH_TYPES[segment];
    if (!type || !/^\d+$/.test(id)) return undefined;
    return { type, id };
  } catch {
    return undefined;
  }
}

export function resolveNeteaseTarget(
  attributes: Record<string, AttributeValue>,
): { type: NeteaseType; id: string; url?: string } | undefined {
  const url = asString(attributes.url) ?? asString(attributes.href);
  const id = asString(attributes.id);
  const typeAttr = asString(attributes.type);

  if (url) {
    const fromUrl = parseNeteaseUrl(url);
    if (!fromUrl) return undefined;
    const type =
      typeAttr && typeAttr in NETEASE_OUTCHAIN ? (typeAttr as NeteaseType) : fromUrl.type;
    return { type, id: id ?? fromUrl.id, url };
  }
  if (!id) return undefined;
  return { type: (typeAttr as NeteaseType) ?? 'playlist', id };
}

/** 网易云官方外链播放器（outchain iframe），Meting 不可用时的降级路径 */
export function neteaseOutchainNode(type: NeteaseType, id: string): MdastNode {
  const outchain = NETEASE_OUTCHAIN[type];
  const iframe = h('iframe', {
    class: 'sd-embed-frame',
    src: `https://music.163.com/outchain/player?type=${outchain.type}&id=${id}&auto=0&height=${outchain.height}`,
    loading: 'lazy',
    scrolling: 'no',
    frameborder: 'no',
    allowfullscreen: true,
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture',
  });
  return wrapHast('div', iframe as never, {
    className: ['sd-embed'],
    'data-sd-provider': 'netease',
  });
}

export function neteasePlaylistHandler(preloaded: Map<string, MetingTrack[]>) {
  return ({
    attributes,
    file,
  }: {
    attributes: Record<string, AttributeValue>;
    file: { message(v: string, p: unknown, s: string): void };
  }): MdastNode[] => {
    const target = resolveNeteaseTarget(attributes);
    if (!target || !/^\d+$/.test(target.id)) {
      file.message(
        '::netease 需要 {id="…"} 或 {url="music.163.com 歌曲或歌单链接"}，已跳过。',
        undefined,
        'sonder-directives',
      );
      return [];
    }

    // 电台无 Meting 解析：直接走官方外链
    if (target.type === 'radio') {
      return [neteaseOutchainNode('radio', target.id)];
    }

    const tracks = preloaded.get(`${target.type}:${target.id}`) ?? [];
    const fallbackUrl = target.url ?? `https://music.163.com/${target.type}?id=${target.id}`;

    if (tracks.length > 0) {
      return [
        buildMusicPlayerNode({
          title: asString(attributes.title) ?? '网易云音乐',
          playlist: tracks,
          size: asString(attributes.size),
          theme: asString(attributes.theme) as MusicThemeName | undefined,
          url: fallbackUrl,
        }),
      ];
    }

    // Meting 未配置或解析失败：降级为官方外链播放器
    file.message(
      `::netease ${target.type} ${target.id} Meting 未配置或解析失败，已降级为官方外链播放器。`,
      undefined,
      'sonder-directives',
    );
    return [neteaseOutchainNode(target.type, target.id)];
  };
}

// ─── ::music-player（官方 embed 模式） ───────────────────

const PROVIDER_NAMES: Record<string, string> = {
  spotify: 'Spotify',
  soundcloud: 'SoundCloud',
  bandcamp: 'Bandcamp',
  'apple-music': 'Apple Music',
  youtube: 'YouTube',
  netease: '网易云音乐',
};

function isHost(value: string, hosts: string[]): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && hosts.includes(parsed.hostname);
  } catch {
    return false;
  }
}

function resolveProviderEmbed(provider: string, url: string): string | undefined {
  const allowed = PROVIDER_NAMES[provider];
  if (!allowed) return undefined;

  if (provider === 'spotify') {
    if (!isHost(url, ['open.spotify.com'])) return undefined;
    try {
      const parsed = new URL(url);
      if (!parsed.pathname.startsWith('/embed/')) parsed.pathname = `/embed${parsed.pathname}`;
      return parsed.toString();
    } catch {
      return undefined;
    }
  }
  if (provider === 'soundcloud') {
    if (!isHost(url, ['soundcloud.com', 'www.soundcloud.com'])) return undefined;
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false`;
  }
  if (provider === 'youtube') {
    if (!isHost(url, ['www.youtube.com', 'youtube.com', 'youtu.be'])) return undefined;
    try {
      const parsed = new URL(url);
      const id =
        parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v');
      return id && /^[\w-]{6,20}$/.test(id)
        ? `https://www.youtube-nocookie.com/embed/${id}`
        : undefined;
    } catch {
      return undefined;
    }
  }
  if (provider === 'netease') {
    if (!isHost(url, ['music.163.com'])) return undefined;
    return url;
  }
  if (provider === 'apple-music') {
    return isHost(url, ['embed.music.apple.com', 'music.apple.com']) ? url : undefined;
  }
  if (provider === 'bandcamp') {
    return url.includes('bandcamp.com') ? url : undefined;
  }
  return undefined;
}

export function musicPlayerEmbedHandler({
  attributes,
  file,
}: {
  attributes: Record<string, AttributeValue>;
  file: { message(v: string, p: unknown, s: string): void };
}): MdastNode[] {
  const provider = asString(attributes.provider);
  const url = asString(attributes.url) ?? asString(attributes.href);
  const title = asString(attributes.title) ?? '正在播放';

  // 本地/直链音频：{src="…"} 走原生播放器（复用 MusicPlayer 的 audio 模式）
  const src = asString(attributes.src);
  if (src) {
    return [
      buildMusicPlayerNode({
        title: asString(attributes.title) ?? '音频',
        artist: asString(attributes.artist),
        artwork: asString(attributes.artwork),
        caption: asString(attributes.caption),
        playlist: [{ title: asString(attributes.title) ?? '音频', src }],
      }),
    ];
  }

  if (!provider || !url) {
    file.message(
      '::music-player 需要 {provider="spotify|soundcloud|youtube|…"} 与 {url}，或 {src="音频直链"}。',
      undefined,
      'sonder-directives',
    );
    return [];
  }

  const embedUrl = resolveProviderEmbed(provider, url);
  if (!embedUrl) {
    file.message(
      `::music-player 无法从 ${url} 生成 ${provider} 的官方播放器地址，已跳过。`,
      undefined,
      'sonder-directives',
    );
    return [];
  }

  return [
    buildMusicPlayerNode({
      title,
      provider,
      providerName: PROVIDER_NAMES[provider],
      embedUrl,
      url,
      caption: asString(attributes.caption),
    }),
  ];
}
