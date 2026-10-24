export type MusicThemeTokens = {
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  accent: string;
  accentContrast: string;
  line: string;
};

export type MusicThemeDefinition = {
  light: MusicThemeTokens;
  dark: MusicThemeTokens;
};

export type MusicThemeName = 'system' | 'site' | 'paper' | 'midnight' | 'vinyl' | 'neon';

const siteTheme: MusicThemeDefinition = {
  light: {
    surface: 'var(--paper-surface)',
    surfaceMuted: 'var(--paper-surface-muted)',
    text: 'var(--paper-ink)',
    textMuted: 'var(--paper-ink-soft)',
    accent: 'var(--paper-accent)',
    accentContrast: 'var(--paper-surface)',
    line: 'var(--paper-line)',
  },
  dark: {
    surface: 'var(--paper-surface)',
    surfaceMuted: 'var(--paper-surface-muted)',
    text: 'var(--paper-ink)',
    textMuted: 'var(--paper-ink-soft)',
    accent: 'var(--paper-accent)',
    accentContrast: 'var(--paper-surface)',
    line: 'var(--paper-line)',
  },
};

export const musicThemes: Record<MusicThemeName, MusicThemeDefinition> = {
  system: siteTheme,
  site: siteTheme,
  paper: {
    light: {
      surface: '#fcfaf6',
      surfaceMuted: '#f5f0e8',
      text: '#39342e',
      textMuted: '#787168',
      accent: '#9a7963',
      accentContrast: '#ffffff',
      line: '#e6ddd1',
    },
    dark: {
      surface: '#282724',
      surfaceMuted: '#302f2a',
      text: '#eeeae2',
      textMuted: '#bbb4a9',
      accent: '#c1a58f',
      accentContrast: '#282724',
      line: '#46423b',
    },
  },
  midnight: {
    light: {
      surface: '#f3f6f9',
      surfaceMuted: '#e8edf2',
      text: '#293442',
      textMuted: '#687684',
      accent: '#68839c',
      accentContrast: '#ffffff',
      line: '#d5dee6',
    },
    dark: {
      surface: '#20272e',
      surfaceMuted: '#29323a',
      text: '#e8edf1',
      textMuted: '#acb8c1',
      accent: '#9aafc0',
      accentContrast: '#20272e',
      line: '#404d58',
    },
  },
  vinyl: {
    light: {
      surface: '#faf7f2',
      surfaceMuted: '#f0e9df',
      text: '#38322b',
      textMuted: '#786f65',
      accent: '#94765c',
      accentContrast: '#ffffff',
      line: '#e1d7ca',
    },
    dark: {
      surface: '#28241f',
      surfaceMuted: '#312c26',
      text: '#eee7df',
      textMuted: '#bdb3a6',
      accent: '#c1a285',
      accentContrast: '#28241f',
      line: '#484037',
    },
  },
  neon: {
    light: {
      surface: '#f8f7fa',
      surfaceMuted: '#efecf3',
      text: '#302d37',
      textMuted: '#716b7c',
      accent: '#88749c',
      accentContrast: '#ffffff',
      line: '#ddd7e4',
    },
    dark: {
      surface: '#26232b',
      surfaceMuted: '#302b35',
      text: '#efebf3',
      textMuted: '#bdb4c5',
      accent: '#b5a2c3',
      accentContrast: '#26232b',
      line: '#48414f',
    },
  },
};

const colorPattern = /^(?:#[0-9a-fA-F]{3,8}|var\(--[\w-]+\))$/;

function safeColor(value: string | undefined, fallback: string) {
  return value && colorPattern.test(value) ? value : fallback;
}

export function resolveMusicTheme(
  theme: MusicThemeName | Partial<MusicThemeDefinition> | undefined,
) {
  const selected = typeof theme === 'string' ? (musicThemes[theme] ?? musicThemes.site) : theme;
  const resolveMode = (mode: 'light' | 'dark') => {
    const defaults = musicThemes.site[mode];
    const tokens = selected?.[mode];
    return Object.fromEntries(
      Object.entries(defaults).map(([key, value]) => [
        key,
        safeColor(tokens?.[key as keyof MusicThemeTokens], value),
      ]),
    ) as MusicThemeTokens;
  };
  return { light: resolveMode('light'), dark: resolveMode('dark') };
}

export function musicThemeStyle(theme: MusicThemeName | Partial<MusicThemeDefinition> | undefined) {
  const resolved = resolveMusicTheme(theme);
  return (['light', 'dark'] as const)
    .flatMap((mode) =>
      Object.entries(resolved[mode]).map(
        ([key, value]) =>
          `--music-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}-${mode}: ${value};`,
      ),
    )
    .join(' ');
}
