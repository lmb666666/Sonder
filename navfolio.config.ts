import { pages, projectsModule, vibeModule } from '@navfolio/pages';
import { markdownPlugin } from '@navfolio/plugin-markdown';

import { defineNavfolioConfig } from './src/plugins/config';

export default defineNavfolioConfig({
  modules: [projectsModule(), vibeModule()],
  plugins: [
    markdownPlugin({
      expressiveCode: true,
      math: {
        enabled: true,
      },
      mermaid: true,
      responsiveTables: true,
    }),
    pages(),
  ],
});
