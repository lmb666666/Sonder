import { markdownPlugin } from '@navfolio/plugin-markdown';

import { defineNavfolioConfig } from './src/plugins/config';

export default defineNavfolioConfig({
  plugins: [
    markdownPlugin({
      expressiveCode: true,
      math: {
        enabled: true,
      },
      mermaid: true,
      responsiveTables: true,
    }),
  ],
});
