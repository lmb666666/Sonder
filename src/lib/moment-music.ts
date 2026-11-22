import { escapeHtml, safeExternalUrl } from './moments';
import { musicThemeStyle } from '../plugins/markdown/directives/music-theme';
import { parseNeteaseMusicUrl, parseTencentMusicUrl } from './music-url';

export type MomentMusicServer = 'netease' | 'tencent' | 'kugou';

export interface MomentSongTarget {
  server: MomentMusicServer;
  type: 'song';
  id: string;
  pageUrl: string;
}

export interface MomentMusicTrack {
  title: string;
  artist?: string;
  artwork?: string;
  src: string;
}

const firstText = (...values: unknown[]): string =>
  values.map((value) => (typeof value === 'string' ? value.trim() : '')).find(Boolean) ?? '';

function artistText(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean)
      .join(' / ');
  }
  return typeof value === 'string' ? value.trim() : '';
}

/** 歌曲页 URL → Meting 目标；仅支持单曲，歌单/专辑仍走原平台链接。 */
export function parseMomentSongUrl(value: string): MomentSongTarget | undefined {
  const netease = parseNeteaseMusicUrl(value);
  if (netease?.type === 'song') {
    return { server: 'netease', type: 'song', id: netease.id, pageUrl: value };
  }

  const tencent = parseTencentMusicUrl(value);
  if (tencent?.type === 'song') {
    return { server: 'tencent', type: 'song', id: tencent.id, pageUrl: value };
  }

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    if (host === 'kugou.com' || host.endsWith('.kugou.com')) {
      const hash = parsed.hash.replace(/^#\/?/, '');
      const hashParams = new URLSearchParams(
        hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : hash,
      );
      const id =
        parsed.searchParams.get('hash') ??
        hashParams.get('hash') ??
        parsed.pathname.match(/\/([\da-f]{32})/i)?.[1] ??
        '';
      if (/^[\da-f]+$/i.test(id)) {
        return { server: 'kugou', type: 'song', id, pageUrl: value };
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}

const trackCache = new Map<string, Promise<MomentMusicTrack | undefined>>();

function parseMetingTrack(body: unknown): MomentMusicTrack | undefined {
  const list = Array.isArray(body)
    ? body
    : Array.isArray((body as { playlist?: unknown[] })?.playlist)
      ? (body as { playlist: unknown[] }).playlist
      : [body];
  const first = list[0] as Record<string, unknown> | undefined;
  if (!first || typeof first !== 'object') return undefined;

  const title = firstText(first.name, first.title);
  const src = safeExternalUrl(first.url);
  if (!title || !src) return undefined;

  return {
    title,
    artist: artistText(first.artist ?? first.artistes) || undefined,
    artwork: safeExternalUrl(first.pic ?? first.cover) || undefined,
    src,
  };
}

/** 运行时解析 Meting 单曲；与 v2 的 ::music 共用同一份 meting_api 配置。 */
export function fetchMomentMusicTrack(
  target: MomentSongTarget,
  metingApi: string,
): Promise<MomentMusicTrack | undefined> {
  const template = metingApi.trim();
  if (!template) return Promise.resolve(undefined);

  const key = `${template}|${target.server}:${target.id}`;
  const cached = trackCache.get(key);
  if (cached) return cached;

  const task = (async () => {
    const endpoint = template
      .replace(/:server/g, target.server)
      .replace(/:type/g, target.type)
      .replace(/:id/g, encodeURIComponent(target.id))
      .replace(/:r/g, String(Math.random()));

    try {
      const response = await fetch(endpoint, {
        signal: AbortSignal.timeout(10_000),
        headers: { accept: 'application/json' },
      });
      if (!response.ok) return undefined;
      return parseMetingTrack(JSON.parse(await response.text()));
    } catch {
      return undefined;
    }
  })();

  trackCache.set(key, task);
  return task;
}

const PLAY_ICON =
  '<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/>';
const PAUSE_ICON =
  '<rect x="14" y="3" width="5" height="18" rx="1"/><rect x="5" y="3" width="5" height="18" rx="1"/>';
const VOLUME_ICON =
  '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>';
const VOLUME_X_ICON =
  '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/>';

function playerIcon(body: string, marker: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${marker} aria-hidden="true">${body}</svg>`;
}

/** 复用 v2 的 sonder-audio-player 标记与客户端控制器，只做单曲模式。 */
export function renderMomentAudioPlayer(track: MomentMusicTrack): string {
  const title = escapeHtml(track.title);
  const artist = track.artist ? escapeHtml(track.artist) : '';
  const src = escapeHtml(track.src);
  const artwork = track.artwork
    ? `<img class="sonder-audio-player__artwork" src="${escapeHtml(
        track.artwork,
      )}" alt="《${title}》封面" loading="lazy" decoding="async" data-artwork />`
    : `<div class="sonder-audio-player__artwork sonder-audio-player__artwork--placeholder" aria-hidden="true"><span>♫</span></div>`;
  const playlist = JSON.stringify([
    {
      title: track.title,
      ...(track.artist ? { artist: track.artist } : {}),
      ...(track.artwork ? { artwork: track.artwork } : {}),
      src: track.src,
    },
  ]).replace(/</g, '\\u003c');

  return (
    `<figure class="sonder-audio-player sonder-audio-player--card sonder-audio-player--normal" style="${musicThemeStyle(
      'site',
    )}" data-sonder-audio-player>` +
    `<div class="sonder-audio-player__body">` +
    artwork +
    `<div class="sonder-audio-player__content">` +
    `<div class="sonder-audio-player__meta">` +
    `<strong data-title data-marquee><span>${title}</span></strong>` +
    (artist ? `<span data-artist data-marquee><span>${artist}</span></span>` : '') +
    `</div>` +
    `<div class="sonder-audio-player__controls">` +
    `<button type="button" class="sonder-audio-player__play" aria-label="播放 ${title}" data-play>` +
    playerIcon(PLAY_ICON, 'data-play-icon') +
    playerIcon(PAUSE_ICON, 'data-pause-icon') +
    `</button>` +
    `<input class="sonder-audio-player__progress" type="range" min="0" max="0" value="0" aria-label="${title} 播放进度" data-progress />` +
    `<span class="sonder-audio-player__time" aria-live="off" data-time>0:00</span>` +
    `<button type="button" class="sonder-audio-player__mute" aria-label="静音" data-mute>` +
    playerIcon(VOLUME_ICON, 'data-volume-icon') +
    playerIcon(VOLUME_X_ICON, 'data-muted-icon') +
    `</button>` +
    `<audio preload="metadata" data-audio><source src="${src}" /></audio>` +
    `</div></div></div>` +
    `<script type="application/json" data-playlist>${playlist}</script>` +
    `</figure>`
  );
}

/** 网易云官方外链播放器：Meting 音频不可用时的兜底（与 ::music 一致）。 */
export function renderNeteaseOutchain(target: MomentSongTarget): string {
  const id = encodeURIComponent(target.id);
  return (
    `<div class="sd-embed" data-sd-provider="netease">` +
    `<iframe class="sd-embed-frame" src="https://music.163.com/outchain/player?type=2&id=${id}&auto=0&height=86" ` +
    `title="网易云音乐播放器" allow="autoplay" style="height:86px" loading="lazy"></iframe>` +
    `</div>`
  );
}
