import { defineTheme } from '@sonder/core';

/**
 * The built-in Sonder visual system. The shared application shell owns the
 * footer; the theme only supplies the document head and base layout.
 */
export const defaultTheme = defineTheme({
  name: '@sonder/theme-default',
  components: {
    baseHead: '@sonder/theme-default/components/BaseHead.astro',
    layout: '@sonder/theme-default/components/BaseLayout.astro',
  },
  styles: ['@sonder/theme-default/styles/global.css'],
  slots: ['head', 'footer', 'article.after', 'sidebar.after'],
});

export { defineTheme } from '@sonder/core';
export type { SonderTheme, SonderThemeComponent } from '@sonder/core';
