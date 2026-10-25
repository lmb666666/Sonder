# Sonder 维护指南

Sonder 是一份 Astro 静态个人发布模板，使用 Bun 运行脚本。这个文件记录仓库的结构和维护约束，供自动化代理与维护者参考。

## 站点结构

- `src/config/site.toml`：站点级配置的唯一入口
- `src/content.config.ts`：站点配置、内容集合的 Zod schema
- `src/content/`：about、blog、media、projects
- `src/pages/`：Astro 路由
- `src/components/theme/`：主题组件、样式和色盘
- `src/modules/`：页面模块（当前启用 media）
- `src/plugins/`：Markdown 与页面运行时插件
- `sonder.config.ts`：页面模块和插件注册

## 构建与验证

```bash
bun install
bun run lint
bun run format:check
bun test
bun run build
```

`bun run build` 会先执行字体子集化，再运行 Astro 静态构建和 Pagefind 索引。部署产物在 `dist/`。

## 约束

- 站点配置必须同时更新 `site.toml` 和 `src/content.config.ts` 的 schema 默认值。
- 页面文案优先放进 `site.toml` 或 i18n 文件，不要在组件里新增硬编码品牌文案。
- 主题视觉统一使用纸面变量：`--paper-*`、`--font-*` 和内置色盘。
- 深色模式、移动端断点、键盘焦点和 reduced-motion 需要一起验证。
- 文章封面放在 `src/assets/figure/covers/`；不要在内容里引用已删除的图片。
- 保持仓库轻量：不提交构建产物、缓存、旧版营销图或未使用的大体积截图。

## 部署

静态站点可以部署到 GitHub Pages、Vercel、Netlify 或任意静态托管。仓库内置的 GitHub Pages 工作流会在 `main` 或 `sonder` 分支构建。
