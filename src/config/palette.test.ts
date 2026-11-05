import { describe, expect, test } from 'bun:test';

import { PALETTE_THEME_COLORS } from './palette';

describe('palette theme colors', () => {
  test('八套色盘都有明暗主题色', () => {
    expect(Object.keys(PALETTE_THEME_COLORS)).toHaveLength(8);
    for (const colors of Object.values(PALETTE_THEME_COLORS)) {
      expect(/^#[0-9a-f]{6}$/i.test(colors.light)).toBe(true);
      expect(/^#[0-9a-f]{6}$/i.test(colors.dark)).toBe(true);
    }
  });
});
