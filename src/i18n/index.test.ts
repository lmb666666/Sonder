import { expect, test } from 'bun:test';
import { createI18n, normalizeLocale } from './index.js';

test('merges catalogs and lets later values override earlier ones', () => {
  const i18n = createI18n({
    locale: 'zh-Hans',
    catalogs: [
      { en: { media: { read: 'Read' } }, 'zh-CN': { media: { read: '阅读' } } },
      { 'zh-CN': { media: { more: '更多' } } },
    ],
  });
  expect(i18n.locale).toBe('zh-CN');
  expect(i18n.t('media.read')).toBe('阅读');
  expect(i18n.t('media.more')).toBe('更多');
  expect(normalizeLocale('unknown')).toBe('en');
});

test('interpolates values and falls back to the key', () => {
  const i18n = createI18n({
    locale: 'en',
    catalogs: [{ en: { count: 'Count: {count}', plural: { one: 'One', other: 'Many' } } }],
  });
  expect(i18n.t('count', { count: 3 })).toBe('Count: 3');
  expect(i18n.t('plural', { count: 1 })).toBe('One');
  expect(i18n.t('plural', { count: 2 })).toBe('Many');
  expect(i18n.t('missing.key')).toBe('missing.key');
});
