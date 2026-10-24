import { defineTheme } from '@navfolio/core';

/**
 * The built-in Navfolio visual system. Component entry points are added as
 * they are migrated out of the legacy Astro application.
 */
export const defaultTheme = defineTheme({
  name: '@navfolio/theme-default',
  components: {
    baseHead: '@navfolio/theme-default/components/BaseHead.astro',
    footer: '@navfolio/theme-default/components/Footer.astro',
    layout: '@navfolio/theme-default/components/BaseLayout.astro',
  },
  styles: ['@navfolio/theme-default/styles/global.css'],
  slots: ['head', 'footer', 'article.after', 'sidebar.after'],
});

export { defineTheme } from '@navfolio/core';
export type { NavfolioTheme, NavfolioThemeComponent } from '@navfolio/core';
