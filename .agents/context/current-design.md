# 当前设计与架构

最后核对：2026-07-25  
证据：当前功能分支、`package.json`、`bun.lock`、当前源码、deploy workflow
与上层生态地图。

## 产品与配置

Navfolio 是以个人介绍、文章、项目、生活片段、媒体记录和外部身份入口为核心的 Astro
starter。当前视觉是 calm editorial dashboard：纸张感色板、克制阴影、紧凑标签和
宽松正文；响应式阅读与导航优先，动效只做增强。

`src/config/site.toml` 是用户配置面，管理身份、色板、字体、页面文案、首页卡片、
导航、搜索、评论和展示设置。`navfolio.config.ts` 是构建期组合入口，显式注册
Projects、Vibe、Media、Pages marker 与 Markdown preset。

## 主站组合流程

```text
page modules + Markdown/pages plugins
  → src/plugins/config.ts
  → Astro integrations / injected routes / remark / rehype

resolved modules
  → content.config.ts / site navigation / new-content / ui-text
```

`astro.config.mjs` 还负责 MDX、sitemap、Tailwind、站点 base/url，以及
`virtual:navfolio/page-runtime` alias。

## 页面模块边界

| 模块     | Package owner                                       | 主站仍负责                                                  |
| -------- | --------------------------------------------------- | ----------------------------------------------------------- |
| Projects | `page-projects` 的 descriptor、i18n、scaffold       | `src/modules/routes/**` 的 index/detail UI 与 schema/config |
| Vibe     | `page-vibe` 的 descriptor、route、UI、交互          | runtime adapter、schema/config 与集成                       |
| Media    | `page-media` 的 descriptor、shelf/review routes、UI | runtime adapter、schema/config 与集成                       |

`pages` 定义公共 protocol、route/enablement 解析、重复 route 校验、scaffold/i18n
聚合、标准模板变量渲染及官方 factory 导出。它默认只启用 Projects；本 starter
显式启用三者。

每个带内容 scaffold 的 page package 都发布 `templates/default.md`，descriptor
通过 URL 指向它。`scripts/new-content.ts` 只负责标准
`<command>:new <filename> [output-directory]` 参数、模板渲染和安全写入；Blog 的
宿主模板位于 `scripts/templates/post.md`。

`src/content.config.ts` 当前仍拥有具体 schemas。关闭 module 后，对应 route、
collection、默认 navigation、scaffold 和 i18n contribution 都应消失。

## Core、Theme 与 Runtime

- `core` v0.2.0 提供 dependency-free i18n runtime，以及 theme manifest/component
  contracts、`defineTheme()` 与 component resolution helper。
- `theme-default` v0.1.0 提供默认 theme manifest、首批 base/layout/blog
  components，以及 global/palette/blog/Markdown-layout styles。
- 主站仍保留 compatibility wrappers、首页 dashboard、Projects 和其他未抽取 UI。
- `src/modules/page-runtime.ts` 是 package-owned routes 的窄适配层，暴露选定
  component、site/i18n helper、image helper 和资源；它是跨仓库 runtime contract。

## Markdown、MDX 与样式

- `plugin-markdown` 统一编排 Expressive Code、math、Mermaid、responsive tables、
  callouts 和 columns/timeline。
- `plugin-callout` 与 `plugin-markdown-layouts` 分别拥有语法和结构输出。
- `theme-default` 拥有共享结构的默认视觉皮肤。
- `mdx-components` 只提供 layout/content 显式 import 的组件和 helper，不配置
  compiler。

## 内容、数据与部署

- starter 内容：`src/content`
- docs/demo 内容：`src/docs` submodule，由
  `NAVFOLIO_CONTENT_SOURCE=docs` 选择
- docs 发布：先推送 `astro-navfolio-docs`，再更新 gitlink 并运行 docs build
- Friend Circle：部署 Action → `public/friend-circle.json` → MDX component/font
  subset consumer
- WeRead：生态 producer 已存在，但主站无 dependency、workflow、route 或 component
  consumer

## 约束

- `core` 不依赖具体 theme。
- package-owned route 不直接 import 主站私有路径，而通过 virtual runtime。
- plugin 结构契约与 theme 视觉契约分离。
- producer 与 consumer 通过可验证、隐私安全的数据契约连接。
- 保持静态输出、无 secret 入库和 GitHub Pages 子路径兼容。
