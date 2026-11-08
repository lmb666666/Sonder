import { describe, expect, test } from 'bun:test';

import { buildTokenCalendar, expandTokenUsage, summarizeTokenUsage } from './token-usage';

describe('token usage', () => {
  test('展开逐日记录并计算等级', () => {
    const days = expandTokenUsage({ start: '2026-01-01', values: [0, 100, 300, 1000] });
    expect(days).toHaveLength(4);
    expect(days[0]?.dateKey).toBe('2026-01-01');
    expect(days.map((day) => day.level)).toEqual([0, 1, 2, 4]);
  });

  test('空数据返回空摘要', () => {
    expect(summarizeTokenUsage([])).toEqual({
      total: 0,
      today: 0,
      peak: null,
      currentStreak: 0,
      longestStreak: 0,
    });
  });

  test('统计总量、今日、峰值与连续天数', () => {
    const days = expandTokenUsage({
      start: '2026-01-01',
      values: [100, 200, 0, 300, 400, 500],
    });
    const summary = summarizeTokenUsage(days);
    expect(summary.total).toBe(1500);
    expect(summary.today).toBe(500);
    expect(summary.peak?.tokens).toBe(500);
    expect(summary.currentStreak).toBe(3);
    expect(summary.longestStreak).toBe(3);
  });

  test('热力图补齐整周并把未来日期标出来', () => {
    const calendar = buildTokenCalendar({ start: '2026-01-01', values: [100, 200] }, 'zh-CN');
    expect(calendar.weeks.length > 0).toBe(true);
    expect(calendar.weeks.every((week) => week.days.length === 7)).toBe(true);
    expect(calendar.days.some((day) => day.future)).toBe(true);
    expect(calendar.months.reduce((sum, month) => sum + month.span, 0)).toBe(calendar.weeks.length);
  });
});
