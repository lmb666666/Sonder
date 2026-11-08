import { describe, expect, test } from 'bun:test';

import {
  detectVideo,
  escapeHtml,
  formatMomentRange,
  groupMomentsByMonth,
  mapEchoItem,
  momentDateInfo,
  momentVideoEmbed,
  safeExternalUrl,
  type MomentItem,
} from './moments';

const localIso = (month: number, day: number, hour = 12, minute = 0) =>
  new Date(2026, month - 1, day, hour, minute).toISOString();

const item = (id: string, date: string): MomentItem => ({
  id,
  content: id,
  date,
});

describe('momentDateInfo', () => {
  test('拆分日期、星期、时间与月份标签', () => {
    const date = new Date(2026, 9, 24, 12, 5);
    const info = momentDateInfo(date, 'zh-CN');

    expect(info).not.toEqual(null);
    expect(info).toEqual({
      day: '24',
      weekday: '周六',
      time: '12:05',
      monthKey: '2026-10',
      monthLabel: '2026 年 10 月',
    });
  });

  test('英文月份标签走 Intl，非法日期返回 null', () => {
    expect(momentDateInfo(new Date(2026, 8, 1), 'en')?.monthLabel).toBe('September 2026');
    expect(momentDateInfo('not-a-date', 'zh-CN')).toEqual(null);
  });
});

describe('groupMomentsByMonth', () => {
  test('按输入顺序分组，并跳过非法日期', () => {
    const groups = groupMomentsByMonth(
      [
        item('a', localIso(10, 24)),
        item('b', localIso(10, 20)),
        item('bad', 'not-a-date'),
        item('c', localIso(9, 28)),
        item('d', localIso(8, 25)),
      ],
      'zh-CN',
    );

    expect(groups.map((group) => group.key)).toEqual(['2026-10', '2026-09', '2026-08']);
    expect(groups[0]?.items.map((entry) => entry.id)).toEqual(['a', 'b']);
    expect(groups[1]?.items.map((entry) => entry.id)).toEqual(['c']);
    expect(groups[0]?.label).toBe('2026 年 10 月');
  });
});

describe('formatMomentRange', () => {
  test('取已加载动态的最早与最晚月份', () => {
    expect(formatMomentRange([item('a', localIso(10, 24)), item('b', localIso(8, 25))])).toBe(
      '2026.08 — 2026.10',
    );
    expect(formatMomentRange([item('a', localIso(10, 24))])).toBe('2026.10');
    expect(formatMomentRange([])).toBe('');
  });
});

describe('momentVideoEmbed / detectVideo', () => {
  test('只接受合法的 B 站与 YouTube id', () => {
    expect(momentVideoEmbed({ provider: 'bilibili', id: 'BV1GJ411x7h7' })?.src).toContain(
      'bvid=BV1GJ411x7h7',
    );
    expect(momentVideoEmbed({ provider: 'youtube', id: 'dQw4w9WgXcQ' })?.src).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    );
    expect(momentVideoEmbed({ provider: 'bilibili', id: 'bad' })).toBeUndefined();
    expect(momentVideoEmbed({ provider: 'youtube', id: 'bad' })).toBeUndefined();
  });

  test('从 URL 或裸 id 识别视频', () => {
    expect(detectVideo('BV1GJ411x7h7')).toEqual({
      provider: 'bilibili',
      id: 'BV1GJ411x7h7',
    });
    expect(detectVideo('https://youtu.be/dQw4w9WgXcQ')).toEqual({
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
    });
    expect(detectVideo('https://www.bilibili.com/video/BV1GJ411x7h7?share_source=copy')).toEqual({
      provider: 'bilibili',
      id: 'BV1GJ411x7h7',
    });
    expect(detectVideo('dQw4w9WgXcQ')).toEqual({
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
    });
    expect(detectVideo('https://www.douyin.com/video/7301234567890123456')).toEqual({
      provider: 'douyin',
      id: '7301234567890123456',
    });
    expect(detectVideo('https://www.tiktok.com/@liang/video/7367543893026422146')).toEqual({
      provider: 'tiktok',
      id: '7367543893026422146',
    });
    expect(detectVideo('javascript:alert(1)')).toBeUndefined();
  });

  test('momentVideoEmbed 复用 v2 的嵌入地址与抖音缩放', () => {
    expect(momentVideoEmbed({ provider: 'bilibili', id: 'BV1GJ411x7h7' })).toEqual({
      kind: 'embed',
      provider: 'bilibili',
      src: 'https://player.bilibili.com/player.html?bvid=BV1GJ411x7h7&autoplay=0&danmaku=0',
    });
    expect(momentVideoEmbed({ provider: 'youtube', id: 'dQw4w9WgXcQ' })?.src).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    );
    expect(momentVideoEmbed({ provider: 'douyin', id: '7301234567890123456' })).toEqual({
      kind: 'video',
      provider: 'douyin',
      src: 'https://open.douyin.com/player/video?vid=7301234567890123456',
      ratio: '27 / 56',
      zoom: 0.0031,
    });
    expect(momentVideoEmbed({ provider: 'tiktok', id: 'abc' })).toBeUndefined();
  });
});

describe('safeExternalUrl', () => {
  test('只放行无凭据的 http(s) 地址', () => {
    expect(safeExternalUrl('https://example.com/a')).toBe('https://example.com/a');
    expect(safeExternalUrl('example.com')).toBe('https://example.com/');
    expect(safeExternalUrl('javascript:alert(1)')).toBe('');
    expect(safeExternalUrl('data:text/html,hello')).toBe('');
    expect(safeExternalUrl('https://user:pass@example.com')).toBe('');
    expect(safeExternalUrl('/relative')).toBe('');
  });
});

describe('escapeHtml', () => {
  test('转义动态内容里的 HTML 字符', () => {
    expect(escapeHtml(`<script>"x"&'y'</script>`)).toBe(
      '&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;',
    );
  });
});

describe('mapEchoItem', () => {
  const apiUrl = 'https://echo.example.com';
  const createdAt = Math.floor(new Date(2026, 9, 24, 12, 0).getTime() / 1000);

  test('映射图片、标签、GitHub 扩展并过滤非图片文件', () => {
    const mapped = mapEchoItem(
      {
        id: 'e1',
        content: '  hello  ',
        created_at: createdAt,
        tags: [{ name: '生活' }, { name: '' }],
        echo_files: [
          {
            file: { url: '/uploads/a.png', content_type: 'image/png' },
            sort_order: 2,
          },
          {
            file: { url: 'https://cdn.example.com/b.jpg' },
            sort_order: 1,
          },
          {
            file: { url: '/uploads/c.pdf', content_type: 'application/pdf' },
            sort_order: 0,
          },
        ],
        extension: {
          type: 'GITHUBPROJ',
          payload: {
            full_name: 'lmb666666/Sonder',
            description: '模板',
          },
        },
      },
      apiUrl,
    );

    expect(mapped).not.toEqual(null);
    expect(mapped?.content).toBe('hello');
    expect(mapped?.tags).toEqual(['生活']);
    expect(mapped?.images).toEqual(['https://cdn.example.com/b.jpg', `${apiUrl}/uploads/a.png`]);
    expect(mapped?.extension).toEqual({
      type: 'github',
      title: 'lmb666666/Sonder',
      description: '模板',
      url: 'https://github.com/lmb666666/Sonder',
    });
  });

  test('VIDEO 扩展转成视频模型，不再输出扩展卡', () => {
    const mapped = mapEchoItem(
      {
        id: 'e2',
        content: '',
        created_at: createdAt,
        extension: {
          type: 'VIDEO',
          payload: { bvid: 'BV1GJ411x7h7' },
        },
      },
      apiUrl,
    );

    expect(mapped?.video).toEqual({
      provider: 'bilibili',
      id: 'BV1GJ411x7h7',
    });
    expect(mapped?.extension).toBeUndefined();
  });

  test('未知扩展降级为网站卡，音乐保留作者描述', () => {
    const website = mapEchoItem(
      {
        id: 'e3',
        created_at: createdAt,
        extension: {
          type: 'FOO',
          payload: { title: 'Example', url: 'example.com' },
        },
      },
      apiUrl,
    );
    expect(website?.extension).toEqual({
      type: 'website',
      title: 'Example',
      description: 'example.com',
      url: 'https://example.com/',
    });

    const music = mapEchoItem(
      {
        id: 'e4',
        created_at: createdAt,
        extension: {
          type: 'MUSIC',
          payload: { title: 'Another Love', artist: 'Tom Odell' },
        },
      },
      apiUrl,
    );
    expect(music?.extension).toEqual({
      type: 'music',
      title: 'Another Love',
      description: 'Tom Odell',
      url: undefined,
    });

    const musicUrl = mapEchoItem(
      {
        id: 'e4b',
        created_at: createdAt,
        extension: {
          type: 'MUSIC',
          payload: { url: 'https://music.163.com/#/song?id=36668690' },
        },
      },
      apiUrl,
    );
    expect(musicUrl?.extension).toEqual({
      type: 'music',
      title: '网易云音乐',
      description: undefined,
      url: 'https://music.163.com/#/song?id=36668690',
    });

    const github = mapEchoItem(
      {
        id: 'e3b',
        created_at: createdAt,
        extension: {
          type: 'GITHUBPROJ',
          payload: { repoUrl: 'https://github.com/moeru-ai/airi' },
        },
      },
      apiUrl,
    );
    expect(github?.extension).toEqual({
      type: 'github',
      title: 'moeru-ai/airi',
      description: 'https://github.com/moeru-ai/airi',
      url: 'https://github.com/moeru-ai/airi',
    });
  });

  test('位置补坐标与高德链接，推文补 @username', () => {
    const location = mapEchoItem(
      {
        id: 'loc',
        created_at: createdAt,
        extension: {
          type: 'LOCATION',
          payload: {
            placeholder: '老城区',
            latitude: 31.2317,
            longitude: 121.4692,
          },
        },
      },
      apiUrl,
    );
    expect(location?.extension?.title).toBe('老城区');
    expect(location?.extension?.description).toBe('31.23°, 121.47°');
    expect(location?.extension?.url).toContain('uri.amap.com/marker');
    expect(location?.extension?.url).toContain('position=121.4692,31.2317');

    const tweet = mapEchoItem(
      {
        id: 'tweet',
        created_at: createdAt,
        extension: {
          type: 'TWEET',
          payload: { text: '今天很好', username: '@liang', url: 'https://x.com/liang/status/1' },
        },
      },
      apiUrl,
    );
    expect(tweet?.extension).toEqual({
      type: 'tweet',
      title: '今天很好',
      description: '@liang',
      url: 'https://x.com/liang/status/1',
    });
  });

  test('缺少 id 或创建时间时返回 null', () => {
    expect(mapEchoItem({ created_at: createdAt }, apiUrl)).toEqual(null);
    expect(mapEchoItem({ id: 'e5' }, apiUrl)).toEqual(null);
  });
});
