import { describe, expect, test } from 'bun:test';

import {
  buildYoulinClientConfig,
  clearYoulinCache,
  fetchYoulinJson,
  mapYoulinCircle,
  mapYoulinLinks,
  toDisplayDate,
} from './youlin';

describe('mapYoulinLinks', () => {
  test('把 Youlin 分组映射成 Sonder 友链结构', () => {
    const groups = mapYoulinLinks({
      groups: [
        {
          name: '朋友们',
          desc: '在这里添加你关注的博客。',
          links: [
            {
              author: 'Liang',
              title: 'Liang 的博客',
              desc: '一位数码科技爱好者',
              link: 'https://blog.liang.one/',
              feed: 'https://blog.liang.one/atom.xml',
              icon: 'https://blog.liang.one/favicon.ico',
              avatar: 'https://blog.liang.one/avatar.webp',
            },
            {
              author: 'Aki',
              link: 'https://aki.example.com/',
              icon: 'https://aki.example.com/favicon.ico',
            },
          ],
        },
      ],
    });

    expect(groups).toEqual([
      {
        title: '朋友们',
        description: '在这里添加你关注的博客。',
        items: [
          {
            name: 'Liang 的博客',
            url: 'https://blog.liang.one/',
            bio: '一位数码科技爱好者',
            avatar: 'https://blog.liang.one/avatar.webp',
            rss: 'https://blog.liang.one/atom.xml',
          },
          {
            name: 'Aki',
            url: 'https://aki.example.com/',
            avatar: 'https://aki.example.com/favicon.ico',
            rss: null,
          },
        ],
      },
    ]);
  });

  test('跳过非法链接，空分组不输出，顶层形状错误返回 null', () => {
    const groups = mapYoulinLinks({
      groups: [
        { name: '空分组', links: [] },
        {
          name: '混合',
          links: [
            { author: 'Bad', link: 'javascript:alert(1)' },
            { author: 'Good', link: 'https://example.com/' },
          ],
        },
      ],
    });

    expect(groups).toHaveLength(1);
    expect(groups?.[0]?.items).toHaveLength(1);
    expect(groups?.[0]?.items[0]?.name).toBe('Good');
    expect(mapYoulinLinks({ groups: 'nope' })).toBe(null);
  });
});

describe('mapYoulinCircle', () => {
  test('映射文章与统计，缺失作者时回退', () => {
    const mapped = mapYoulinCircle({
      stats: { friends: 6, active: 4, failed: 2, articles: 17, updatedAt: '2026-10-05T13:55:00Z' },
      articles: [
        {
          title: '近期小记（1）',
          link: 'https://blog.liang.one/posts/6b4e8a1',
          author: 'Liang',
          avatar: 'https://blog.liang.one/avatar.webp',
          publishedAt: '2026-09-20T12:04:00Z',
        },
        {
          title: '无作者文章',
          link: 'https://example.com/post',
          publishedAt: '2026-09-21T00:00:00Z',
        },
      ],
    });

    expect(mapped?.stats.friends).toBe(6);
    expect(mapped?.posts).toHaveLength(2);
    expect(mapped?.posts[0]).toEqual({
      title: '近期小记（1）',
      url: 'https://blog.liang.one/posts/6b4e8a1',
      author: 'Liang',
      avatar: 'https://blog.liang.one/avatar.webp',
      date: '2026-09-20T12:04:00Z',
    });
    expect(mapped?.posts[1]?.author).toBe('朋友');
  });

  test('跳过非法文章，顶层形状错误返回 null', () => {
    const mapped = mapYoulinCircle({
      stats: {},
      articles: [
        { title: 'Bad', link: 'not-a-url' },
        { title: 'Good', link: 'https://example.com/' },
      ],
    });

    expect(mapped?.posts).toHaveLength(1);
    expect(mapYoulinCircle({ articles: 'nope' })).toBe(null);
  });
});

describe('fetchYoulinJson', () => {
  test('成功响应缓存 60 秒', async () => {
    clearYoulinCache();
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    const first = await fetchYoulinJson<{ ok: boolean }>('https://youlin.example.com/api/links', {
      fetchImpl,
    });
    const second = await fetchYoulinJson<{ ok: boolean }>('https://youlin.example.com/api/links', {
      fetchImpl,
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(calls).toBe(1);
  });

  test('HTTP 失败不缓存，并返回错误信息', async () => {
    clearYoulinCache();
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return new Response('nope', { status: 500 });
    }) as unknown as typeof fetch;

    const first = await fetchYoulinJson('https://youlin.example.com/api/links', { fetchImpl });
    const second = await fetchYoulinJson('https://youlin.example.com/api/links', { fetchImpl });

    expect(first).toEqual({ ok: false, error: 'HTTP 500' });
    expect(second).toEqual({ ok: false, error: 'HTTP 500' });
    expect(calls).toBe(2);
  });
});

describe('toDisplayDate', () => {
  test('ISO / RFC 822 都输出 YYYY-MM-DD', () => {
    expect(toDisplayDate('2026-09-20T12:04:00Z')).toBe('2026-09-20');
    expect(toDisplayDate('Tue, 03 Sep 2026 08:00:00 GMT')).toBe('2026-09-03');
    expect(toDisplayDate('')).toBe('');
    expect(toDisplayDate('not-a-date')).toBe('not-a-date');
  });
});

describe('buildYoulinClientConfig', () => {
  test('两个 URL 都为空时返回 null', () => {
    expect(
      buildYoulinClientConfig({
        linksUrl: null,
        circleUrl: null,
        timeoutMs: 8000,
        pageSize: 20,
        messages: {
          note: '',
          circleSummary: '',
          unavailable: '',
          emptyLinks: '',
          emptyCircle: '',
        },
      }),
    ).toBe(null);
  });

  test('保留 URL、超时与文案模板', () => {
    const config = buildYoulinClientConfig({
      linksUrl: 'https://youlin.example.com/api/links',
      circleUrl: null,
      timeoutMs: 5000,
      pageSize: 12,
      messages: {
        note: '共 {total} 位朋友',
        circleSummary: '{friends} / {active} / {posts}',
        unavailable: '不可用',
        emptyLinks: '没有友链',
        emptyCircle: '没有动态',
      },
    });

    expect(config?.linksUrl).toBe('https://youlin.example.com/api/links');
    expect(config?.circleUrl).toBe(null);
    expect(config?.timeoutMs).toBe(5000);
    expect(config?.pageSize).toBe(12);
    expect(config?.messages.note).toBe('共 {total} 位朋友');
  });
});
