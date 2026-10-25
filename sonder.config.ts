// NOTE(M1 vendoring): relative imports — this file is evaluated by Astro's
// config loader, which does not apply the @sonder/* Vite aliases.
import { mediaModule, pages } from './src/modules';
import { markdownPlugin } from './src/plugins/markdown';

import { defineSonderConfig } from './src/plugins/config';

export default defineSonderConfig({
  modules: [mediaModule()],
  plugins: [
    markdownPlugin({
      expressiveCode: true,
      layouts: true,
      math: {
        enabled: true,
      },
      mermaid: true,
      responsiveTables: true,
    }),
    pages(),
  ],
});
