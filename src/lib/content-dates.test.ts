import { describe, expect, test } from 'bun:test';

import { isMeaningfulUpdate } from './content-dates';

describe('isMeaningfulUpdate', () => {
  const published = new Date('2026-01-01T00:00:00.000Z');

  test('没有 updated 时不显示', () => {
    expect(isMeaningfulUpdate(published)).toBe(false);
  });

  test('同一天或更早的 updated 不显示', () => {
    expect(isMeaningfulUpdate(published, new Date('2026-01-01T10:00:00.000Z'))).toBe(false);
    expect(isMeaningfulUpdate(published, new Date('2025-12-31T00:00:00.000Z'))).toBe(false);
  });

  test('晚于发布时间至少 1 天才显示', () => {
    expect(isMeaningfulUpdate(published, new Date('2026-01-02T00:00:00.000Z'))).toBe(true);
    expect(isMeaningfulUpdate(published, new Date('2026-02-01T00:00:00.000Z'))).toBe(true);
  });
});
