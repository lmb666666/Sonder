import { readFileSync } from 'node:fs';
import { h } from 'hastscript';
import { musicThemeStyle, type MusicThemeName } from '../../../components/mdx/lib/music-theme.js';
import type { AttributeValue, MdastNode } from './handlers.js';
import { buildLinkCard, wrapHast } from './handlers.js';
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

  if (playlist.length > 0 && isNative) {
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

function metingApiTemplate(): string {
  try {
    const toml = readFileSync(new URL('../../../config/site.toml', import.meta.url), 'utf8');
    return /meting_api\s*=\s*"([^"]*)"/.exec(toml)?.[1] ?? '';
  } catch {
    return '';
  }
}

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

/** 构建期解析网易云歌单（带模块级缓存，构建从不失败）。 */
export function fetchMetingTracks(id: string): Promise<MetingTrack[]> {
  const cached = metingCache.get(id);
  if (cached) return Promise.resolve(cached);

  const pending = metingPending.get(id);
  if (pending) return pending;

  const template = metingApiTemplate();
  const task = (async () => {
    if (!template) return [];
    const endpoint = template
      .replace(/:server/g, 'netease')
      .replace(/:type/g, 'playlist')
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
      metingCache.set(id, tracks);
      return tracks;
    } catch (error) {
      console.warn(
        `[sonder-directives] Meting 歌单 ${id} 解析失败：${error instanceof Error ? error.message : error}`,
      );
      metingCache.set(id, []);
      return [];
    } finally {
      metingPending.delete(id);
    }
  })();
  metingPending.set(id, task);
  return task;
}

// ─── ::netease（歌单走原生播放器，其余类型走 outchain） ──

export function neteasePlaylistHandler(preloaded: Map<string, MetingTrack[]>) {
  return ({
    attributes,
    file,
  }: {
    attributes: Record<string, AttributeValue>;
    file: { message(v: string, p: unknown, s: string): void };
  }): MdastNode[] => {
    const type = asString(attributes.type) ?? 'playlist';
    const id = asString(attributes.id) ?? '';
    if (!/^\d+$/.test(id)) {
      file.message(
        '::netease 需要 {id="歌单/曲目 ID"} 属性，已跳过。',
        undefined,
        'sonder-directives',
      );
      return [];
    }

    // song / album / radio 保留 outchain iframe（index.ts 的 embedHandler 处理）
    if (type !== 'playlist') return [];

    const tracks = preloaded.get(id) ?? [];
    const fallbackUrl = `https://music.163.com/#/playlist?id=${id}`;
    const fallbackTitle = asString(attributes.title) ?? '网易云歌单';

    if (tracks.length === 0) {
      file.message(
        `::netease 歌单 ${id} 解析失败，已降级为链接卡片。`,
        undefined,
        'sonder-directives',
      );
      const card = buildLinkCard(
        fallbackUrl,
        fallbackTitle,
        '歌单解析失败，点击在网易云音乐打开',
        'https://p1.music.126.net/q7J5VsX8XmvwNq4a-OgKfA==/109951168192611458.jpg',
      );
      return [wrapHast('a', card as never)];
    }

    return [
      buildMusicPlayerNode({
        title: fallbackTitle,
        playlist: tracks,
        size: asString(attributes.size),
        theme: asString(attributes.theme) as MusicThemeName | undefined,
        url: fallbackUrl,
      }),
    ];
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

  if (!provider || !url) {
    file.message(
      '::music-player 需要 {provider="spotify|soundcloud|youtube|…"} 与 {url} 属性。',
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
