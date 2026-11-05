import { describe, expect, test } from 'bun:test';

import { elapsedParts } from './time';

describe('elapsedParts', () => {
  test('拆出前两层非零单位', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const now = new Date('2027-03-05T00:00:00Z');
    const parts = elapsedParts(start, now);
    expect(parts[0]?.unit).toBe('year');
    expect(parts[1]?.unit).toBe('month');
    expect(parts.every((part) => part.value > 0)).toBe(true);
  });

  test('非法日期返回空数组', () => {
    expect(elapsedParts('not-a-date')).toEqual([]);
  });

  test('未来日期不产生负值', () => {
    expect(elapsedParts('2030-01-01', new Date('2026-01-01'))).toEqual([]);
  });
});
