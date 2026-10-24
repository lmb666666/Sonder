import { expect, test } from 'bun:test';
import { createI18n, defineTheme, getThemeComponent, normalizeLocale } from './index.js';

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

test('keeps a theme manifest package-addressable', () => {
  const theme = defineTheme({
    name: '@navfolio/theme-default',
    components: {
      layout: '@navfolio/theme-default/layouts/BaseLayout.astro',
    },
    styles: ['@navfolio/theme-default/styles/palettes.css'],
  });

  expect(getThemeComponent(theme, 'layout')).toBe(
    '@navfolio/theme-default/layouts/BaseLayout.astro',
  );
  expect(getThemeComponent(theme, 'footer')).toBeUndefined();
});
