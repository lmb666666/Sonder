import { defineTheme } from '@sonder/core';

/**
 * The built-in Sonder visual system. Component entry points are added as
 * they are migrated out of the legacy Astro application.
 */
export const defaultTheme = defineTheme({
  name: '@sonder/theme-default',
  components: {
    baseHead: '@sonder/theme-default/components/BaseHead.astro',
    footer: '@sonder/theme-default/components/Footer.astro',
    layout: '@sonder/theme-default/components/BaseLayout.astro',
  },
  styles: ['@sonder/theme-default/styles/global.css'],
  slots: ['head', 'footer', 'article.after', 'sidebar.after'],
});

export { defineTheme } from '@sonder/core';
export type { SonderTheme, SonderThemeComponent } from '@sonder/core';
