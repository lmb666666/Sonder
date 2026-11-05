/** 与 palettes.css 的 --paper-theme-color 保持一致；SSR/manifest 使用。 */
export const PALETTE_THEME_COLORS = {
  'green-soft': { light: '#f3f4ee', dark: '#171a12' },
  'green-vivid': { light: '#ecf4ec', dark: '#111f13' },
  'rose-soft': { light: '#f5f2f2', dark: '#1c1516' },
  'pink-soft': { light: '#f5f2f4', dark: '#1c1518' },
  'purple-soft': { light: '#f2f2f6', dark: '#16151c' },
  'blue-soft': { light: '#f2f5f7', dark: '#14181c' },
  'orange-soft': { light: '#f7f3ed', dark: '#1c1610' },
  'brown-soft': { light: '#f4f2f0', dark: '#1c1815' },
} as const;

export type PaletteName = keyof typeof PALETTE_THEME_COLORS;
