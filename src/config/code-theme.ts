import type { ThemeRegistration } from 'shiki';
import en from '../i18n/en.json';
import zhCN from '../i18n/zh-CN.json';
import zhTW from '../i18n/zh-TW.json';
import { normalizeLocale } from '../i18n';

/**
 * 纸面代码块主题：token 颜色全部引用站点令牌，换色盘与深浅色时自动生效。
 * Shiki/EC 会把 var()/color-mix() 原样写进行内 --0/--1 变量。
 */

const accent = (percent: number) =>
  `color-mix(in srgb, var(--paper-accent) ${percent}%, var(--paper-ink) ${100 - percent}%)`;

const tokenSettings = [
  { settings: { foreground: 'var(--paper-ink)' } },
  {
    scope: ['comment', 'punctuation.definition.comment', 'string.comment'],
    settings: { foreground: 'var(--paper-ink-faint)', fontStyle: 'italic' },
  },
  {
    scope: ['keyword', 'storage', 'storage.type', 'keyword.control', 'keyword.operator'],
    settings: { foreground: accent(80) },
  },
  {
    scope: ['string', 'punctuation.definition.string', 'string.regexp', 'string.template'],
    settings: { foreground: accent(65) },
  },
  {
    scope: ['constant', 'constant.numeric', 'constant.language', 'support.constant'],
    settings: { foreground: accent(75) },
  },
  {
    scope: ['entity.name.function', 'support.function', 'meta.function-call'],
    settings: { foreground: accent(70) },
  },
  {
    scope: [
      'entity.name.type',
      'entity.name.class',
      'support.type',
      'support.class',
      'entity.name.namespace',
    ],
    settings: { foreground: accent(70), fontStyle: 'bold' },
  },
  {
    scope: ['variable', 'variable.parameter', 'variable.other'],
    settings: { foreground: 'var(--paper-ink-soft)' },
  },
  {
    scope: ['punctuation', 'meta.brace'],
    settings: { foreground: 'var(--paper-ink-soft)' },
  },
  {
    scope: ['entity.name.tag', 'entity.other.attribute-name'],
    settings: { foreground: accent(80) },
  },
  {
    scope: ['invalid', 'invalid.illegal'],
    settings: { foreground: '#b04a3c' },
  },
  {
    scope: ['markup.heading'],
    settings: { foreground: accent(80), fontStyle: 'bold' },
  },
  { scope: ['markup.inline.raw'], settings: { foreground: accent(65) } },
  { scope: ['markup.bold'], settings: { fontStyle: 'bold' } },
  { scope: ['markup.italic'], settings: { fontStyle: 'italic' } },
] satisfies ThemeRegistration['settings'];

function createPaperTheme(name: string, type: 'light' | 'dark'): ThemeRegistration {
  return {
    name,
    type,
    colors: {
      'editor.background': type === 'dark' ? '#273026' : '#f7f8f3',
      'editor.foreground': type === 'dark' ? '#eaebe5' : '#272d28',
      'editorLineNumber.foreground': type === 'dark' ? '#98a294' : '#626c62',
      'scrollbarSlider.background': type === 'dark' ? '#a8baa966' : '#667d6d55',
      'scrollbarSlider.hoverBackground': type === 'dark' ? '#a8baa9aa' : '#667d6d88',
    },
    settings: tokenSettings,
  };
}

export const paperCodeThemes = {
  light: createPaperTheme('sonder-paper-light', 'light'),
  dark: createPaperTheme('sonder-paper-dark', 'dark'),
};

type CodeCopy = (typeof zhCN)['codeBlock'];
const catalogs: Record<string, CodeCopy> = {
  en: en.codeBlock,
  'zh-CN': zhCN.codeBlock,
  'zh-TW': zhTW.codeBlock,
};

export function getCodeCollapseLabels(locale: string | undefined) {
  const resolved = normalizeLocale(locale);
  const copy = catalogs[resolved] ?? catalogs['zh-CN']!;

  return {
    expandButtonText: copy.showMore,
    collapseButtonText: copy.showLess,
    expandedAnnouncement: copy.expanded,
    collapsedAnnouncement: copy.collapsed,
  };
}
