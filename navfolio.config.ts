// NOTE(M1 vendoring): relative imports — this file is evaluated by Astro's
// config loader, which does not apply the @navfolio/* Vite aliases.
import { mediaModule, pages, projectsModule, vibeModule } from './src/modules';
import { markdownPlugin } from './src/plugins/markdown';

import { defineNavfolioConfig } from './src/plugins/config';

export default defineNavfolioConfig({
  modules: [projectsModule(), vibeModule(), mediaModule()],
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
