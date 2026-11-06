import { describe, expect, test } from 'bun:test';

import type { ResolvedYoulinConfig } from '../../../config/youlin';
import { clearYoulinCache } from '../../../lib/youlin';
import type { MdastNode } from './handlers';
import { getYoulinDirectiveDefaults, prefetchYoulinDirectives } from './youlin';

const config: ResolvedYoulinConfig = {
  baseUrl: 'https://youlin.test',
  timeoutMs: 8000,
  links: { mode: 'build', sources: ['youlin', 'local'], group: '' },
  circle: { mode: 'build', sources: ['youlin', 'demo'], limit: 0 },
  apply: { provider: 'auto' },
  directives: { friendCircle: 'auto', friendLinkCard: 'auto' },
};

const originalFetch = globalThis.fetch;

const tree = (name: string, attributes: Record<string, string | true> = {}) => ({
  children: [{ type: 'leafDirective', name, attributes }] as MdastNode[],
});

function json(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('getYoulinDirectiveDefaults', () => {
  test('auto 只在配置了 baseUrl 时启用 youlin', () => {
    expect(getYoulinDirectiveDefaults(config)).toEqual({
      friendCircle: 'youlin',
      friendLinkCard: 'youlin',
    });
    expect(getYoulinDirectiveDefaults({ ...config, baseUrl: '' })).toEqual({
      friendCircle: null,
      friendLinkCard: null,
    });
  });

  test('demo 与显式 youlin', () => {
    expect(
      getYoulinDirectiveDefaults({
        ...config,
        directives: { friendCircle: 'demo', friendLinkCard: 'youlin' },
      }),
    ).toEqual({ friendCircle: 'demo', friendLinkCard: 'youlin' });
  });
});

describe('prefetchYoulinDirectives', () => {
  test('只为出现的目标源发请求，并映射成指令数据结构', async () => {
    clearYoulinCache();
    const fetchImpl = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('/api/links')) {
        return json({
          groups: [
            {
              name: '朋友们',
              links: [
                {
                  author: 'Liang',
                  title: 'Liang 的博客',
                  link: 'https://blog.liang.one/',
                  avatar: 'https://blog.liang.one/avatar.webp',
                  feed: 'https://blog.liang.one/atom.xml',
                },
              ],
            },
          ],
        });
      }
      return json({
        stats: { friends: 1, active: 1, failed: 0, articles: 1, updatedAt: null },
        articles: [
          {
            title: '近期小记',
            link: 'https://blog.liang.one/posts/1',
            author: 'Liang',
            publishedAt: '2026-09-20T12:04:00Z',
          },
        ],
      });
    }) as unknown as typeof fetch;

    globalThis.fetch = fetchImpl;
    try {
      const data = await prefetchYoulinDirectives(tree('friend-circle', { src: 'youlin' }), config);

      expect(data?.error).toBeUndefined();
      expect(data?.links?.[0]?.name).toBe('Liang 的博客');
      expect(data?.circle?.posts[0]?.title).toBe('近期小记');
      expect(data?.circle?.friendCount).toBe(1);
      expect(data?.circle?.friends[0]?.url).toBe('https://blog.liang.one/');
    } finally {
      globalThis.fetch = originalFetch;
      clearYoulinCache();
    }
  });

  test('friend-link-card 支持 src=youlin', async () => {
    clearYoulinCache();
    const fetchImpl = (async () =>
      json({
        groups: [{ name: '朋友们', links: [{ author: 'Aki', link: 'https://aki.example.com/' }] }],
      })) as unknown as typeof fetch;

    globalThis.fetch = fetchImpl;
    try {
      const data = await prefetchYoulinDirectives(
        tree('friend-link-card', { src: 'youlin' }),
        config,
      );
      expect(data?.links?.[0]?.name).toBe('Aki');
      expect(data?.circle).toBe(null);
    } finally {
      globalThis.fetch = originalFetch;
      clearYoulinCache();
    }
  });

  test('没有 youlin 目标时不发请求', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return json({});
    }) as unknown as typeof fetch;

    try {
      expect(await prefetchYoulinDirectives(tree('friend-circle', { src: 'demo' }), config)).toBe(
        null,
      );
      expect(
        await prefetchYoulinDirectives(
          tree('friend-link-card', { name: '内联', url: 'https://example.com/' }),
          config,
        ),
      ).toBe(null);
      expect(calls).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
      clearYoulinCache();
    }
  });

  test('auto 且未配置 baseUrl 时保留“未指定 src”的行为', async () => {
    const data = await prefetchYoulinDirectives(tree('friend-circle'), { ...config, baseUrl: '' });
    expect(data).toBe(null);
  });

  test('显式 youlin 但 baseUrl 为空时返回可诊断错误', async () => {
    const data = await prefetchYoulinDirectives(tree('friend-circle', { src: 'youlin' }), {
      ...config,
      baseUrl: '',
    });
    expect(data).toEqual({
      links: null,
      circle: null,
      error: 'youlin.baseUrl 未配置，已回退演示数据',
    });
  });

  test('请求失败时返回错误而不是抛异常', async () => {
    clearYoulinCache();
    globalThis.fetch = (async () =>
      new Response('nope', { status: 500 })) as unknown as typeof fetch;

    try {
      const data = await prefetchYoulinDirectives(tree('friend-circle', { src: 'youlin' }), config);
      expect(data?.links).toBe(null);
      expect(data?.circle).toBe(null);
      expect(data?.error).toContain('links: HTTP 500');
      expect(data?.error).toContain('circle: HTTP 500');
    } finally {
      globalThis.fetch = originalFetch;
      clearYoulinCache();
    }
  });
});
