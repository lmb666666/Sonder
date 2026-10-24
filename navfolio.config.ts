// NOTE(M1 vendoring): relative imports — this file is evaluated by Astro's
// config loader, which does not apply the @navfolio/* Vite aliases.
import { mediaModule, pages } from './src/modules';
import { markdownPlugin } from './src/plugins/markdown';

import { defineNavfolioConfig } from './src/plugins/config';

// NOTE(M4): vibeModule 已禁用（动态信息结构由 Sonder 风格的 /moments 页承接）。
// NOTE(M6): projectsModule 已并入关于页（/about 展示项目卡片）；需要恢复独立
// 项目页时，重新引入 projectsModule() 即可。
export default defineNavfolioConfig({
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
