import { describe, expect, test } from 'bun:test';

import type { ResolvedYoulinConfig } from '../config/youlin';
import { clearYoulinCache } from './youlin';
import { resolveFriendLinkGroups, type FriendSourceDeps } from './friend-sources';
import type { FriendLinkGroup } from './friend-data';

const config: ResolvedYoulinConfig = {
  baseUrl: 'https://youlin.test',
  timeoutMs: 8000,
  links: { mode: 'build', sources: ['youlin', 'local'], group: '' },
  circle: { limit: 0 },
  apply: { provider: 'auto', turnstileSiteKey: '', timeoutMs: 45000 },
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

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function deps(overrides: Partial<FriendSourceDeps> = {}): FriendSourceDeps {
  return { localGroups, ...overrides };
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
