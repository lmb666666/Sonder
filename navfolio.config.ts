// NOTE(M1 vendoring): relative imports — this file is evaluated by Astro's
// config loader, which does not apply the @navfolio/* Vite aliases.
import { mediaModule, pages, projectsModule } from './src/modules';
import { markdownPlugin } from './src/plugins/markdown';

import { defineNavfolioConfig } from './src/plugins/config';

// NOTE(M4): vibeModule 已禁用（动态信息结构由 Sonder 风格的 /moments 页承接）。
// 需要恢复 navfolio 原生 vibe 页时，重新引入 vibeModule() 即可。
export default defineNavfolioConfig({
  modules: [projectsModule(), mediaModule()],
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
