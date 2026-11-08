import { describe, expect, test } from 'bun:test';

import { collectSiteStats } from './site-stats';

function createPost(
  body: string,
  date: string,
  options: { updated?: string; draft?: boolean } = {},
) {
  return {
    body,
    data: {
      date: new Date(date),
      updated: options.updated ? new Date(options.updated) : undefined,
      draft: options.draft,
    },
  };
}

describe('collectSiteStats', () => {
  test('空列表返回零值', () => {
    expect(collectSiteStats([])).toEqual({ totalWords: 0, lastUpdatedAt: null });
  });

  test('累加非草稿文章字数', () => {
    const stats = collectSiteStats([
      createPost('hello 世界', '2026-01-01'),
      createPost('another note', '2026-01-02'),
    ]);

    expect(stats.totalWords).toBe(5);
  });

  test('排除草稿', () => {
    const stats = collectSiteStats([
      createPost('published', '2026-01-01'),
      createPost('draft text that should not count', '2026-01-02', { draft: true }),
    ]);

    expect(stats.totalWords).toBe(1);
  });

  test('最后更新时间优先使用 updated', () => {
    const stats = collectSiteStats([
      createPost('a', '2026-01-01', { updated: '2026-03-01' }),
      createPost('b', '2026-02-01'),
    ]);

    expect(stats.lastUpdatedAt?.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  test('没有 updated 时回退 date，并取最大值', () => {
    const stats = collectSiteStats([
      createPost('a', '2026-01-01'),
      createPost('b', '2026-04-01'),
      createPost('c', '2026-02-01'),
    ]);

    expect(stats.lastUpdatedAt?.toISOString()).toBe('2026-04-01T00:00:00.000Z');
  });

  test('updated 早于 date 时以 date 为准', () => {
    const stats = collectSiteStats([createPost('a', '2026-05-01', { updated: '2026-04-01' })]);

    expect(stats.lastUpdatedAt?.toISOString()).toBe('2026-05-01T00:00:00.000Z');
  });
});
