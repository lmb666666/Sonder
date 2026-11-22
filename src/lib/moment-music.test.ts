import { describe, expect, test } from 'bun:test';

import {
  fetchMomentMusicTrack,
  parseMomentSongUrl,
  renderMomentAudioPlayer,
  renderNeteaseOutchain,
} from './moment-music';

describe('parseMomentSongUrl', () => {
  test('解析网易云 hash / 路径与 QQ、酷狗单曲', () => {
    expect(parseMomentSongUrl('https://music.163.com/#/song?id=36668690')).toEqual({
      server: 'netease',
      type: 'song',
      id: '36668690',
      pageUrl: 'https://music.163.com/#/song?id=36668690',
    });
    expect(parseMomentSongUrl('https://music.163.com/song?id=123')).toEqual({
      server: 'netease',
      type: 'song',
      id: '123',
      pageUrl: 'https://music.163.com/song?id=123',
    });
    expect(parseMomentSongUrl('https://music.163.com/song/456')).toEqual({
      server: 'netease',
      type: 'song',
      id: '456',
      pageUrl: 'https://music.163.com/song/456',
    });
    expect(parseMomentSongUrl('https://y.qq.com/n/ryqq/songDetail/0039MnYb0qxYhV')).toEqual({
      server: 'tencent',
      type: 'song',
      id: '0039MnYb0qxYhV',
      pageUrl: 'https://y.qq.com/n/ryqq/songDetail/0039MnYb0qxYhV',
    });
    expect(parseMomentSongUrl('https://y.qq.com/n/ryqq/song/0039MnYb0qxYhV.html')).toEqual({
      server: 'tencent',
      type: 'song',
      id: '0039MnYb0qxYhV',
      pageUrl: 'https://y.qq.com/n/ryqq/song/0039MnYb0qxYhV.html',
    });
    expect(
      parseMomentSongUrl('https://www.kugou.com/song/#hash=ABCDEF0123456789ABCDEF0123456789'),
    ).toEqual({
      server: 'kugou',
      type: 'song',
      id: 'ABCDEF0123456789ABCDEF0123456789',
      pageUrl: 'https://www.kugou.com/song/#hash=ABCDEF0123456789ABCDEF0123456789',
    });
  });

  test('歌单与非歌曲地址不解析', () => {
    expect(parseMomentSongUrl('https://music.163.com/#/playlist?id=123')).toBeUndefined();
    expect(parseMomentSongUrl('https://example.com/song/1')).toBeUndefined();
    expect(parseMomentSongUrl('not a url')).toBeUndefined();
  });
});

describe('renderMomentAudioPlayer', () => {
  test('复用 sonder-audio-player 标记并转义内容', () => {
    const html = renderMomentAudioPlayer({
      title: '<script>alert(1)</script>',
      artist: 'Badfinger',
      artwork: 'https://cdn.example.com/cover.jpg',
      src: 'https://cdn.example.com/song.mp3',
    });

    expect(html).toContain('data-sonder-audio-player');
    expect(html).toContain('sonder-audio-player--card');
    expect(html).toContain('data-play');
    expect(html).toContain('data-progress');
    expect(html).toContain('data-audio');
    expect(html).toContain('data-playlist');
    expect(html).toContain('https://cdn.example.com/song.mp3');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});

describe('renderNeteaseOutchain', () => {
  test('生成官方外链播放器 iframe', () => {
    const html = renderNeteaseOutchain({
      server: 'netease',
      type: 'song',
      id: '36668690',
      pageUrl: 'https://music.163.com/#/song?id=36668690',
    });
    expect(html).toContain('outchain/player?type=2&id=36668690');
    expect(html).toContain('data-sd-provider="netease"');
  });
});

describe('fetchMomentMusicTrack', () => {
  test('解析 Meting 响应；失败时不抛异常', async () => {
    const originalFetch = globalThis.fetch;
    const template = `https://meting.example.test/?server=:server&type=:type&id=:id&r=:r&t=${Date.now()}`;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify([
          {
            name: 'Baby Blue',
            artist: 'Badfinger',
            url: 'https://cdn.example.com/baby-blue.mp3',
            pic: 'https://cdn.example.com/baby-blue.jpg',
          },
        ]),
        { headers: { 'content-type': 'application/json' } },
      )) as unknown as typeof fetch;

    try {
      const track = await fetchMomentMusicTrack(
        {
          server: 'netease',
          type: 'song',
          id: '36668690',
          pageUrl: 'https://music.163.com/#/song?id=36668690',
        },
        template,
      );
      expect(track).toEqual({
        title: 'Baby Blue',
        artist: 'Badfinger',
        artwork: 'https://cdn.example.com/baby-blue.jpg',
        src: 'https://cdn.example.com/baby-blue.mp3',
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
