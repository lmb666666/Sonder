import { h } from 'hastscript';
import { musicThemeStyle, type MusicThemeName } from './music-theme.js';
import type { AttributeValue, MdastNode } from './handlers.js';
import { buildLinkCard, wrapHast } from './handlers.js';
import { icon } from './icons.js';

/**
 * 音乐指令渲染：构建期输出原生播放器 / 官方 embed / 曲目卡片 / 链接卡片。
 * - `::audio{src="…"}` → 本地或直链音频
 * - `::music{url|provider+url|server+type+id}` → Meting 优先，官方 embed 兜底
 */

type HastLike = ReturnType<typeof h>;

export interface MusicTrack {
  title: string;
  artist?: string;
  artwork?: string;
  src: string;
  caption?: string;
}

export interface AudioPlayerOptions {
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
export function buildAudioPlayerNode(options: AudioPlayerOptions): MdastNode {
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
          class: 'sonder-audio-player__artwork',
          src: resolvedArtwork,
          alt: `《${resolvedTitle}》封面`,
          loading: 'lazy',
          decoding: 'async',
          'data-artwork': '',
        })
      : h(
          'div',
          {
            class: 'sonder-audio-player__artwork sonder-audio-player__artwork--placeholder',
            'aria-hidden': 'true',
          },
          [h('span', ['♫'])],
        ),
  ];

  const meta = h(
    'div',
    { class: 'sonder-audio-player__meta' },
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
      h('div', { class: 'sonder-audio-player__controls' }, [
        h(
          'button',
          {
            type: 'button',
            class: 'sonder-audio-player__play',
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
          class: 'sonder-audio-player__progress',
          type: 'range',
          min: '0',
          max: '0',
          value: '0',
          'aria-label': `${resolvedTitle} 播放进度`,
          'data-progress': '',
        }),
        h('span', { class: 'sonder-audio-player__time', 'aria-live': 'off', 'data-time': '' }, [
          '0:00',
        ]),
        h(
          'button',
          {
            type: 'button',
            class: 'sonder-audio-player__mute',
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
        { class: 'sonder-audio-player__provider' },
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
      h('p', { class: 'sonder-audio-player__unavailable' }, ['未能生成可用的官方播放器地址。']),
    );
  }

  body.push(h('div', { class: 'sonder-audio-player__content' }, contentChildren));

  const children: HastLike[] = [h('div', { class: 'sonder-audio-player__body' }, body)];

  if (embed) {
    children.push(
      h('iframe', {
        class: 'sonder-audio-player__embed',
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
      h('details', { class: 'sonder-audio-player__playlist' }, [
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
      class: `sonder-audio-player sonder-audio-player--card sonder-audio-player--${sizeClass}`,
      style: musicThemeStyle(theme),
      'data-sonder-audio-player': '',
    },
    children,
  );
  return wrapHast('figure', figure as never);
}

// ─── 平台目标解析 ─────────────────────────────────────────

export type MusicServer = 'netease' | 'tencent';
export type MusicType = 'song' | 'playlist' | 'album' | 'radio';
export type MetingType = Exclude<MusicType, 'radio'>;
export type EmbedProvider = 'spotify' | 'soundcloud' | 'apple-music' | 'bandcamp';

export type MusicTarget =
  | { kind: 'meting'; server: MusicServer; type: MusicType; id: string; pageUrl: string }
  | { kind: 'embed'; provider: EmbedProvider; url: string; embedUrl: string };

const NETEASE_PATH_TYPES: Record<string, MusicType> = {
  song: 'song',
  playlist: 'playlist',
  album: 'album',
  program: 'radio',
};

const TENCENT_PATH_TYPES: Record<string, MusicType> = {
  songDetail: 'song',
  playlist: 'playlist',
  album: 'album',
};

const NETEASE_OUTCHAIN: Record<MusicType, { type: string; height: string }> = {
  song: { type: '2', height: '86' },
  playlist: { type: '0', height: '450' },
  album: { type: '10', height: '430' },
  radio: { type: '19', height: '330' },
};

const PROVIDER_NAMES: Record<EmbedProvider, string> = {
  spotify: 'Spotify',
  soundcloud: 'SoundCloud',
  'apple-music': 'Apple Music',
  bandcamp: 'Bandcamp',
};

const EMBED_PROVIDERS = Object.keys(PROVIDER_NAMES) as EmbedProvider[];

function defaultPageUrl(server: MusicServer, type: MusicType, id: string): string {
  if (server === 'netease') {
    return `https://music.163.com/${type === 'radio' ? 'program' : type}?id=${id}`;
  }

  return type === 'playlist'
    ? `https://y.qq.com/n/ryqq/playlist/${id}`
    : `https://y.qq.com/n/ryqq/${type === 'song' ? 'songDetail' : type}/${id}`;
}

function normalizeMusicType(value: string | undefined): MusicType | undefined {
  return value === 'song' || value === 'playlist' || value === 'album' || value === 'radio'
    ? value
    : undefined;
}

/** 从 music.163.com 链接识别类型与 ID（兼容 /#/song?id=… 旧式 hash 路由）。 */
export function parseNeteaseUrl(value: string): { type: MusicType; id: string } | undefined {
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

/** 从 y.qq.com 链接识别类型与 ID（歌曲/专辑 mid 为字母数字）。 */
export function parseTencentUrl(value: string): { type: MusicType; id: string } | undefined {
  try {
    const parsed = new URL(value);
    if (!/(^|\.)y\.qq\.com$/i.test(parsed.hostname)) return undefined;
    const match = parsed.pathname.match(/\/(songDetail|playlist|album)\/([\w-]+)/i);
    if (!match) return undefined;
    const type = TENCENT_PATH_TYPES[match[1]!];
    if (!type) return undefined;
    return { type, id: match[2]! };
  } catch {
    return undefined;
  }
}

function isHost(value: string, hosts: string[]): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && hosts.includes(parsed.hostname);
  } catch {
    return false;
  }
}

function resolveProviderEmbed(provider: EmbedProvider, url: string): string | undefined {
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
  if (provider === 'apple-music') {
    return isHost(url, ['embed.music.apple.com', 'music.apple.com']) ? url : undefined;
  }
  if (provider === 'bandcamp') {
    return url.includes('bandcamp.com') ? url : undefined;
  }
  return undefined;
}

function embedProviderForUrl(url: string): EmbedProvider | undefined {
  if (isHost(url, ['open.spotify.com'])) return 'spotify';
  if (isHost(url, ['soundcloud.com', 'www.soundcloud.com'])) return 'soundcloud';
  if (isHost(url, ['embed.music.apple.com', 'music.apple.com'])) return 'apple-music';
  if (url.includes('bandcamp.com')) return 'bandcamp';
  return undefined;
}

/** 把 ::music 的属性解析成 Meting 目标或官方 embed 目标。 */
export function resolveMusicTarget(
  attributes: Record<string, AttributeValue>,
): MusicTarget | undefined {
  const url = asString(attributes.url) ?? asString(attributes.href);
  const provider = asString(attributes.provider);
  const server = asString(attributes.server);
  const id = asString(attributes.id);
  const requestedType = normalizeMusicType(asString(attributes.type));

  const resolveMeting = (targetServer: MusicServer): MusicTarget | undefined => {
    const parsed =
      url === undefined
        ? undefined
        : targetServer === 'netease'
          ? parseNeteaseUrl(url)
          : parseTencentUrl(url);
    const targetId = id ?? parsed?.id;
    if (!targetId) return undefined;
    const type = requestedType ?? parsed?.type ?? 'playlist';
    if (targetServer === 'tencent' && type === 'radio') return undefined;
    if (targetServer === 'netease' && type !== 'radio' && !/^\d+$/.test(targetId)) return undefined;
    if (targetServer === 'tencent' && !/^[\w-]+$/.test(targetId)) return undefined;

    return {
      kind: 'meting',
      server: targetServer,
      type,
      id: targetId,
      pageUrl: url ?? defaultPageUrl(targetServer, type, targetId),
    };
  };

  if (server === 'netease' || server === 'tencent') return resolveMeting(server);
  if (provider === 'netease' || provider === 'tencent') return resolveMeting(provider);

  if (provider && EMBED_PROVIDERS.includes(provider as EmbedProvider) && url) {
    const embedUrl = resolveProviderEmbed(provider as EmbedProvider, url);
    return embedUrl
      ? { kind: 'embed', provider: provider as EmbedProvider, url, embedUrl }
      : undefined;
  }

  if (!url) {
    // 只给 id/type 时默认网易云，保持 ::music{type id} 的直觉用法。
    return id ? resolveMeting('netease') : undefined;
  }

  if (parseNeteaseUrl(url)) return resolveMeting('netease');
  if (parseTencentUrl(url)) return resolveMeting('tencent');

  const embedProvider = embedProviderForUrl(url);
  if (embedProvider) {
    const embedUrl = resolveProviderEmbed(embedProvider, url);
    return embedUrl ? { kind: 'embed', provider: embedProvider, url, embedUrl } : undefined;
  }

  return undefined;
}

/** 网易云官方外链播放器（outchain iframe），Meting 不可用时的兜底。 */
export function neteaseOutchainNode(type: MusicType, id: string): MdastNode {
  const outchain = NETEASE_OUTCHAIN[type];
  const iframe = h('iframe', {
    class: 'sd-embed-frame',
    src: `https://music.163.com/outchain/player?type=${outchain.type}&id=${id}&auto=0&height=${outchain.height}`,
    loading: 'lazy',
  });

  return wrapHast('div', iframe as never, {
    className: ['sd-embed'],
    'data-sd-provider': 'netease',
  });
}

// ─── Meting（平台曲目 → 原生播放器） ──────────────────────

export type MetingTrack = MusicTrack;

const metingCache = new Map<string, MetingTrack[]>();
const metingPending = new Map<string, Promise<MetingTrack[]>>();
const audioProbeCache = new Map<string, boolean>();

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

/** 构建期解析曲目/歌单（带模块级缓存，构建从不失败）。 */
export function fetchMetingTracks(
  server: MusicServer,
  id: string,
  type: MetingType = 'playlist',
  template = '',
): Promise<MetingTrack[]> {
  const cacheKey = `${template}|${server}:${type}:${id}`;
  const cached = metingCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  const pending = metingPending.get(cacheKey);
  if (pending) return pending;

  const task = (async () => {
    if (!template) return [];
    const endpoint = template
      .replace(/:server/g, server)
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
        `[sonder-directives] Meting ${server} ${type} ${id} 解析失败：${error instanceof Error ? error.message : error}`,
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

/** 探测音频直链是否真的返回音频；Meting 例子的 QQ 平台常返回空 HTML。 */
export async function probeAudio(url: string): Promise<boolean> {
  const cached = audioProbeCache.get(url);
  if (cached !== undefined) return cached;

  const attempt = async (method: 'HEAD' | 'GET') => {
    const response = await fetch(url, {
      method,
      headers: method === 'GET' ? { range: 'bytes=0-0' } : undefined,
      signal: AbortSignal.timeout(8_000),
    });
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    return response.ok && contentType.startsWith('audio/');
  };

  try {
    const ok = (await attempt('HEAD')) || (await attempt('GET'));
    audioProbeCache.set(url, ok);
    return ok;
  } catch {
    audioProbeCache.set(url, false);
    return false;
  }
}

export interface MusicPrefetchEntry {
  tracks: MetingTrack[];
  audioOk: boolean;
}

export type MusicPrefetch = Map<string, MusicPrefetchEntry>;

export function musicKey(target: { server: MusicServer; type: MusicType; id: string }) {
  return `${target.server}:${target.type}:${target.id}`;
}

/** 预取文档内全部 ::music 的 Meting 目标并探测音频可用性。 */
export async function prefetchMusic(
  tree: { children?: MdastNode[] },
  metingApi: string,
): Promise<MusicPrefetch> {
  const targets = new Map<string, Extract<MusicTarget, { kind: 'meting' }>>();
  const visit = (nodes: MdastNode[] | undefined) => {
    for (const node of nodes ?? []) {
      if (node.type === 'leafDirective' && node.name === 'music') {
        const target = resolveMusicTarget(node.attributes ?? {});
        if (target?.kind === 'meting' && target.type !== 'radio') {
          targets.set(musicKey(target), target);
        }
      }
      visit(node.children);
    }
  };
  visit(tree.children);

  const map: MusicPrefetch = new Map();
  await Promise.all(
    [...targets.values()].map(async (target) => {
      const tracks = await fetchMetingTracks(
        target.server,
        target.id,
        target.type as MetingType,
        metingApi,
      );
      const audioOk = tracks.length > 0 ? await probeAudio(tracks[0]!.src) : false;
      map.set(musicKey(target), { tracks, audioOk });
    }),
  );
  return map;
}

// ─── 指令 handler ────────────────────────────────────────

export function buildMusicCardNode(tracks: MetingTrack[], href: string, title: string): MdastNode {
  const first = tracks[0];
  const trackRows = tracks
    .slice(0, 5)
    .map((track) =>
      h(
        'li',
        { class: 'sd-music-card__track' },
        [
          h('span', { class: 'sd-music-card__track-title' }, [track.title]),
          track.artist
            ? h('span', { class: 'sd-music-card__track-artist' }, [track.artist])
            : undefined,
        ].filter(Boolean) as HastLike[],
      ),
    );

  const card = h(
    'div',
    { class: 'sd-music-card' },
    [
      first?.artwork
        ? h('img', {
            class: 'sd-music-card__cover',
            src: first.artwork,
            alt: '',
            loading: 'lazy',
            decoding: 'async',
          })
        : undefined,
      h(
        'div',
        { class: 'sd-music-card__body' },
        [
          h('strong', { class: 'sd-music-card__title' }, [title]),
          first?.artist ? h('span', { class: 'sd-music-card__artist' }, [first.artist]) : undefined,
          trackRows.length > 0 ? h('ol', { class: 'sd-music-card__tracks' }, trackRows) : undefined,
          h(
            'a',
            {
              class: 'sd-music-card__link',
              href,
              target: '_blank',
              rel: 'noopener noreferrer',
            },
            ['在平台打开'],
          ),
        ].filter(Boolean) as HastLike[],
      ),
    ].filter(Boolean) as HastLike[],
  );

  return wrapHast('div', card as unknown as ReturnType<typeof h>);
}

export function audioHandler({
  attributes,
  file,
}: {
  attributes: Record<string, AttributeValue>;
  file: { message(v: string, p: unknown, s: string): void };
}): MdastNode[] {
  const src = asString(attributes.src);
  if (!src) {
    file.message(
      '::audio 需要 {src="音频直链或 public 路径"}，已跳过。',
      undefined,
      'sonder-directives',
    );
    return [];
  }

  return [
    buildAudioPlayerNode({
      title: asString(attributes.title) ?? '音频',
      artist: asString(attributes.artist),
      artwork: asString(attributes.artwork),
      caption: asString(attributes.caption),
      playlist: [{ title: asString(attributes.title) ?? '音频', src }],
    }),
  ];
}

export function musicHandler(preloaded: MusicPrefetch) {
  return ({
    attributes,
    file,
  }: {
    attributes: Record<string, AttributeValue>;
    file: { message(v: string, p: unknown, s: string): void };
  }): MdastNode[] => {
    const target = resolveMusicTarget(attributes);
    if (!target) {
      file.message(
        '::music 需要 {url}、{provider+url} 或 {server+type+id}；YouTube 视频请使用 ::youtube。',
        undefined,
        'sonder-directives',
      );
      return [];
    }

    if (target.kind === 'embed') {
      return [
        buildAudioPlayerNode({
          title: asString(attributes.title) ?? PROVIDER_NAMES[target.provider],
          provider: target.provider,
          providerName: PROVIDER_NAMES[target.provider],
          embedUrl: target.embedUrl,
          url: target.url,
          caption: asString(attributes.caption),
        }),
      ];
    }

    const title =
      asString(attributes.title) ?? (target.server === 'netease' ? '网易云音乐' : 'QQ 音乐');
    const fallbackUrl = target.pageUrl;

    if (target.type === 'radio') {
      return [neteaseOutchainNode('radio', target.id)];
    }

    const entry = preloaded.get(musicKey(target));
    if (entry?.tracks.length && entry.audioOk) {
      return [
        buildAudioPlayerNode({
          title,
          playlist: entry.tracks,
          size: asString(attributes.size),
          theme: asString(attributes.theme) as MusicThemeName | undefined,
          url: fallbackUrl,
        }),
      ];
    }

    if (target.server === 'netease') {
      file.message(
        `::music 网易云 ${target.type} ${target.id} 音频不可用，已降级为官方外链播放器。`,
        undefined,
        'sonder-directives',
      );
      return [neteaseOutchainNode(target.type, target.id)];
    }

    if (entry?.tracks.length) {
      file.message(
        `::music QQ 音乐 ${target.type} ${target.id} 音频不可用，已渲染为曲目卡片。`,
        undefined,
        'sonder-directives',
      );
      return [buildMusicCardNode(entry.tracks, fallbackUrl, title)];
    }

    file.message(
      `::music ${target.server} ${target.type} ${target.id} 元数据不可用，已降级为链接卡片。`,
      undefined,
      'sonder-directives',
    );
    return [buildLinkCard(fallbackUrl, title, '在平台打开')];
  };
}
