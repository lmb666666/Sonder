import { describe, expect, test } from 'bun:test';

import type { ResolvedYoulinConfig } from '../config/youlin';
import { clearYoulinCache } from './youlin';
import {
  resolveFriendCircle,
  resolveFriendLinkGroups,
  type FriendSourceDeps,
} from './friend-sources';
import type { FriendCircleFeed, FriendLinkGroup } from './friend-data';

const config: ResolvedYoulinConfig = {
  baseUrl: 'https://youlin.test',
  timeoutMs: 8000,
  links: { mode: 'build', sources: ['youlin', 'local'], group: '' },
  circle: {
    mode: 'build',
    sources: ['youlin', 'friendcircle', 'public', 'rss', 'demo'],
    limit: 0,
  },
  apply: { provider: 'auto' },
  directives: { friendCircle: 'auto', friendLinkCard: 'auto' },
};

const localGroups: FriendLinkGroup[] = [
  {
    title: '本地',
    items: [
      {
        name: 'Local',
        url: 'https://local.example.com/',
        rss: 'https://local.example.com/feed.xml',
      },
    ],
  },
];

const demo: FriendCircleFeed = {
  friends: [{ name: 'Demo', url: 'https://demo.example.com/' }],
  posts: [{ title: 'Demo post', url: 'https://demo.example.com/post', author: 'Demo' }],
};

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function deps(overrides: Partial<FriendSourceDeps> = {}): FriendSourceDeps {
  return {
    localGroups,
    demo,
    ...overrides,
  };
}

const cachedTest = (name: string, fn: () => void | Promise<void>) =>
  test(name, async () => {
    clearYoulinCache();
    await fn();
  });

describe('resolveFriendLinkGroups', () => {
  cachedTest('Youlin 成功时使用接口数据', async () => {
    const fetchImpl = (async () =>
      json({
        groups: [
          { name: '远端', links: [{ author: 'Remote', link: 'https://remote.example.com/' }] },
        ],
      })) as unknown as typeof fetch;

    const result = await resolveFriendLinkGroups(config, deps({ fetchImpl }));

    expect(result.source).toBe('youlin');
    expect(result.youlinTried).toBe(true);
    expect(result.groups[0]?.title).toBe('远端');
  });

  cachedTest('Youlin 失败时回退本地，并记录原因', async () => {
    const fetchImpl = (async () =>
      new Response('nope', { status: 500 })) as unknown as typeof fetch;

    const result = await resolveFriendLinkGroups(config, deps({ fetchImpl }));

    expect(result.source).toBe('local');
    expect(result.groups).toBe(localGroups);
    expect(result.errors).toEqual(['youlin: HTTP 500']);
  });

  cachedTest('skipYoulin 时不发请求，直接用本地', async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return json({ groups: [] });
    }) as unknown as typeof fetch;

    const result = await resolveFriendLinkGroups(config, deps({ fetchImpl }), { skipYoulin: true });

    expect(calls).toBe(0);
    expect(result.source).toBe('local');
    expect(result.youlinTried).toBe(false);
  });

  cachedTest('Youlin 返回合法空分组时视为成功，不回退本地', async () => {
    const fetchImpl = (async () => json({ groups: [] })) as unknown as typeof fetch;

    const result = await resolveFriendLinkGroups(config, deps({ fetchImpl }));

    expect(result.source).toBe('youlin');
    expect(result.groups).toEqual([]);
  });
});

describe('resolveFriendCircle', () => {
  cachedTest('Youlin 成功（即使 0 篇）时不继续回退', async () => {
    const fetchImpl = (async () =>
      json({
        stats: { friends: 3, active: 0, failed: 0, articles: 0, updatedAt: null },
        articles: [],
      })) as unknown as typeof fetch;

    const result = await resolveFriendCircle(config, deps({ fetchImpl }), {
      links: localGroups,
    });

    expect(result.source).toBe('youlin');
    expect(result.posts).toEqual([]);
    expect(result.friendsCount).toBe(3);
    expect(result.stats?.friends).toBe(3);
  });

  cachedTest('Youlin 失败后走 friendcircle', async () => {
    const fetchImpl = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('/api/circle')) return new Response('nope', { status: 500 });
      return json({
        friends: [{ name: 'FCL', url: 'https://fcl.example.com/' }],
        posts: [{ title: 'FCL post', url: 'https://fcl.example.com/post', author: 'FCL' }],
      });
    }) as unknown as typeof fetch;

    const result = await resolveFriendCircle(config, deps({ fetchImpl }), {
      links: localGroups,
      feedSrc: 'https://fcl.example.com/api',
    });

    expect(result.source).toBe('friendcircle');
    expect(result.posts[0]?.title).toBe('FCL post');
    expect(result.errors[0]).toContain('youlin');
  });

  cachedTest('friendcircle 解析失败后读 public 文件', async () => {
    const fetchImpl = (async () =>
      new Response('not json', { status: 200 })) as unknown as typeof fetch;
    const readPublic = async (file: string) =>
      file === 'friend-circle.json'
        ? JSON.stringify({
            posts: [
              { title: 'Public post', url: 'https://public.example.com/post', author: 'Public' },
            ],
          })
        : null;

    const result = await resolveFriendCircle(config, deps({ fetchImpl, readPublic }), {
      links: localGroups,
      feedSrc: 'https://fcl.example.com/api',
    });

    expect(result.source).toBe('public');
    expect(result.posts[0]?.title).toBe('Public post');
  });

  cachedTest('readPublic 抛错时回退 demo，不中断解析', async () => {
    const fetchImpl = (async () =>
      new Response('nope', { status: 500 })) as unknown as typeof fetch;
    const readPublic = async () => {
      throw new Error('EISDIR');
    };
    const crawl = async () => [];

    const result = await resolveFriendCircle(config, deps({ fetchImpl, readPublic, crawl }), {
      links: localGroups,
      feedSrc: '/friend-circle.json',
    });

    expect(result.source).toBe('demo');
    expect(result.errors.some((error) => error.includes('EISDIR'))).toBe(true);
  });

  cachedTest('RSS 抓取 0 篇后回退 demo', async () => {
    const fetchImpl = (async () =>
      new Response('nope', { status: 500 })) as unknown as typeof fetch;
    const crawl = async () => [];

    const result = await resolveFriendCircle(config, deps({ fetchImpl, crawl }), {
      links: localGroups,
    });

    expect(result.source).toBe('demo');
    expect(result.demo).toBe(true);
    expect(result.posts[0]?.title).toBe('Demo post');
  });

  cachedTest('Youlin 与本地源都不可用时返回空结果', async () => {
    const fetchImpl = (async () =>
      new Response('nope', { status: 500 })) as unknown as typeof fetch;

    const result = await resolveFriendCircle(
      { ...config, circle: { ...config.circle, sources: ['youlin'] } },
      deps({ fetchImpl }),
      { links: [] },
    );

    expect(result.source).toBe(null);
    expect(result.posts).toEqual([]);
    expect(result.youlinTried).toBe(true);
  });
});
