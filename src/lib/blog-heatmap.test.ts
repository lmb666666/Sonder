import { describe, expect, test } from 'bun:test';

import { createRecentBlogHeatmap } from './blog-heatmap';

describe('createRecentBlogHeatmap', () => {
  test('YYYY-MM-DD 起始日期按本地日历日解析', () => {
    const heatmap = createRecentBlogHeatmap([], 12, '2026-01-01');

    expect(heatmap.startDate).toBe('2025-12-29');
    expect(heatmap.days[0]?.date).toBe('2025-12-29');
  });
});
