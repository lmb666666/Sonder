// NOTE(M1 vendoring): relative imports — this file is evaluated by Astro's
// config loader, which does not apply the @sonder/* Vite aliases.
import { mediaModule, pages } from './src/modules';
import { markdownPlugin } from './src/plugins/markdown';

import { defineSonderConfig } from './src/plugins/config';

// NOTE(M6): projectsModule 已并入关于页（/about 展示项目卡片）；需要恢复独立
// 项目页时，重新引入 projectsModule() 即可。
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
