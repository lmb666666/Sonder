/** 音乐平台 URL 解析：::music 指令与动态页音乐卡共用，避免两套正则。 */

export type MusicType = 'song' | 'playlist' | 'album' | 'radio';

const NETEASE_PATH_TYPES: Record<string, MusicType> = {
  song: 'song',
  playlist: 'playlist',
  album: 'album',
  program: 'radio',
};

const TENCENT_PATH_TYPES: Record<string, MusicType> = {
  songdetail: 'song',
  song: 'song',
  playlist: 'playlist',
  album: 'album',
};

/** 从 music.163.com 链接识别类型与 ID（兼容 /#/song?id=… 旧式 hash 路由）。 */
export function parseNeteaseMusicUrl(value: string): { type: MusicType; id: string } | undefined {
  try {
    const parsed = new URL(value);
    if (!/(^|\.)music\.163\.com$/i.test(parsed.hostname)) return undefined;
    const source = parsed.hash.startsWith('#/')
      ? parsed.hash.slice(1)
      : `${parsed.pathname}${parsed.search}`;
    const [path, query = ''] = source.split('?');
    const id = new URLSearchParams(query).get('id') ?? path.match(/\/song\/(\d+)/)?.[1] ?? '';
    const segment = path.split('/').filter(Boolean)[0] ?? '';
    const type = NETEASE_PATH_TYPES[segment];
    if (!type || !/^\d+$/.test(id)) return undefined;
    return { type, id };
  } catch {
    return undefined;
  }
}

/** 从 y.qq.com 链接识别类型与 ID（歌曲/专辑 mid 为字母数字）。 */
export function parseTencentMusicUrl(value: string): { type: MusicType; id: string } | undefined {
  try {
    const parsed = new URL(value);
    if (!/(^|\.)y\.qq\.com$/i.test(parsed.hostname)) return undefined;
    const match = parsed.pathname.match(/\/(songDetail|song|playlist|album)\/([\w-]+)/i);
    const type = match ? TENCENT_PATH_TYPES[match[1]!.toLowerCase()] : 'song';
    const id =
      parsed.searchParams.get('songmid') ??
      match?.[2] ??
      parsed.pathname.match(/\/([\w-]+)\.html$/i)?.[1] ??
      '';
    if (!type || !/^[\w-]+$/.test(id)) return undefined;
    return { type, id };
  } catch {
    return undefined;
  }
}
