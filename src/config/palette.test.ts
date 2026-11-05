import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PALETTE_THEME_COLORS } from './palette';

const palettesCss = readFileSync(join(process.cwd(), 'src/styles/palettes.css'), 'utf8');

function cssThemeColor(palette: string, mode: 'light' | 'dark') {
  const blockPattern =
    mode === 'dark'
      ? new RegExp(
          `:root\\[data-theme='dark'\\]\\[data-palette='${palette}'\\]\\s*\\{([\\s\\S]*?)\\}`,
        )
      : new RegExp(`:root\\[data-palette='${palette}'\\]\\s*\\{([\\s\\S]*?)\\}`);
  const block = blockPattern.exec(palettesCss)?.[1] ?? '';
  return /--paper-theme-color:\s*(#[0-9a-f]{6})/i.exec(block)?.[1]?.toLowerCase();
}

describe('palette theme colors', () => {
  test('八套色盘都有明暗主题色', () => {
    expect(Object.keys(PALETTE_THEME_COLORS)).toHaveLength(8);
    for (const colors of Object.values(PALETTE_THEME_COLORS)) {
      expect(/^#[0-9a-f]{6}$/i.test(colors.light)).toBe(true);
      expect(/^#[0-9a-f]{6}$/i.test(colors.dark)).toBe(true);
    }
  });

  test('TS 色表与 palettes.css 的 --paper-theme-color 一致', () => {
    for (const [name, colors] of Object.entries(PALETTE_THEME_COLORS)) {
      expect(cssThemeColor(name, 'light')).toBe(colors.light.toLowerCase());
      expect(cssThemeColor(name, 'dark')).toBe(colors.dark.toLowerCase());
    }
  });
});
