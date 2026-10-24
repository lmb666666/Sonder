---
title: 'Page Module 页面能力配置指南'
description: '了解 navfolio 如何用 @navfolio/pages 统一管理 Projects、Vibe、书影音等可开启、可关闭、可改路由的页面模块。'
date: '2026-07-12T16:30:00+08:00'
draft: false
showHeroImage: false
tags:
  - Astro
  - Configuration
  - Navfolio
categories:
  - 功能模块
series:
  - 功能模块
comments: true
sidebar:
  enable: true
  toc: true
  relatedPosts: true
---

navfolio 默认展示完整的模板能力，所以 `Projects` 和 `Vibe` 页面都是开启的。真实站点可以把这些页面能力当成 page module：需要就保留，不需要就关闭，想换路由也可以在构建配置里调整。

page module 通过 `@navfolio/pages` 协议统一接入，但具体页面包按需安装：

- `@navfolio/pages`：导出 page module 类型、配置解析工具、`pages()` 插件标记和默认 Projects 模块。
- `@navfolio/page-projects`：导出 `projectsModule()`。
- `@navfolio/page-vibe`：可选包，拥有 Vibe 的 Astro 路由、页面 UI 和交互逻辑，并由 `@navfolio/pages` 导出 `vibeModule()`。
- `@navfolio/page-media`：提供书、影、音页面实现，由 `@navfolio/pages` 导出 `mediaModule()`。
- `@navfolio/page-template`：给贡献者参考的自定义页面模块模板。

## 配置入口

page module 有两层配置入口：

- `src/config/site.toml`：快速内容配置，适合改导航文案、导航顺序、页面标题、说明文字和首页卡片。
- `navfolio.config.ts`：高级构建配置，适合改页面是否启用、真实路由、内容目录、脚手架命令和后续插件注册。

真实 route 由 `navfolio.config.ts` 决定。`site.toml` 里的导航可以用 `module` 引用模块 id，这样不会把构建级路由重复写进 TOML。

## 默认开启

模板默认启用内置页面模块：

```ts
import { mediaModule, pages, projectsModule, vibeModule } from '@navfolio/pages';
import { markdownPlugin } from '@navfolio/plugin-markdown';

import { defineNavfolioConfig } from './src/plugins/config';

export default defineNavfolioConfig({
  modules: [projectsModule(), vibeModule(), mediaModule()],
  plugins: [markdownPlugin(), pages()],
});
```

默认路由和内容目录是：

| 模块               | 默认路由    | 内容目录                |
| ------------------ | ----------- | ----------------------- |
| `projectsModule()` | `/projects` | `src/content/projects/` |
| `vibeModule()`     | `/vibe`     | `src/content/vibe/`     |
| `mediaModule()`    | `/media`    | `src/content/media/`    |

默认开启是为了让模板站点完整展示作品集页面、碎片记录页面、博客文章和其他内置体验。你在落地自己的站点时，可以按需要删减。

这里的“默认开启”是 starter 的显式选择，不代表 `@navfolio/pages` 会强制安装 Vibe。新站点只有安装 `@navfolio/page-vibe` 并注册 `vibeModule()`，才会包含 Vibe 页面代码。

## 快速配置导航

推荐在 `src/config/site.toml` 里用 `module` 引用页面模块：

```toml
[[config.topNav.links]]
label = "Projects"
module = "projects"

[[config.topNav.links]]
label = "Vibe"
module = "vibe"

[[config.topNav.links]]
label = "书影音"
module = "media"
```

这样 `site.toml` 只负责导航的显示顺序和文字，真实路径仍由 `navfolio.config.ts` 里的模块配置决定。如果你之后把 `vibe` 改成 `/space`，导航会自动指向 `/space`。

普通页面和外链继续使用 `href`：

```toml
[[config.topNav.links]]
label = "About"
href = "/about"

[[config.topNav.links]]
label = "GitHub"
href = "https://github.com/dodolalorc/astro-navfolio"
```

旧写法 `href = "/projects"`、`href = "/vibe"` 仍然兼容。navfolio 会识别这些默认模块路由，并在你自定义 route 时自动改写为真实路径。不过新站点更推荐使用 `module`。

## 禁用页面

如果暂时不需要某个页面，可以把对应模块设为 `enabled: false`：

```ts
export default defineNavfolioConfig({
  modules: [projectsModule({ enabled: false }), vibeModule({ enabled: false })],
  plugins: [markdownPlugin(), pages()],
});
```

禁用后不只是隐藏导航，而是从构建层面移除这项能力：

- 不注入对应页面路由。
- 不注册对应内容集合。
- 不生成对应 `dist` 输出。
- 使用 `module = "..."` 引用该模块的导航项会被过滤。
- 对应内容脚手架命令会给出禁用提示。

也就是说，禁用 `vibeModule()` 后，`/vibe` 不会存在，`src/content/vibe/` 也不会作为 Astro content collection 参与构建。

如果确定不再需要 Vibe，可以直接从 `modules` 删除 `vibeModule()`，再移除 `@navfolio/page-vibe` 依赖。这样依赖安装中也不会包含 Vibe 页面 UI；这是完整的包级按需使用。

## 自定义路由

你可以保留页面能力，但改成自己的路径。例如把 Vibe 页面作为 `/space` 使用：

```ts
export default defineNavfolioConfig({
  modules: [projectsModule(), vibeModule({ route: '/space' }), mediaModule({ route: '/shelf' })],
  plugins: [markdownPlugin(), pages()],
});
```

构建结果会生成 `/space` 与 `/shelf`，不会再生成 `/vibe` 与 `/media`。站点顶部导航、博客页顶部导航、搜索结果类型识别等位置会读取 resolved route，所以它们会跟随新的路径。

`route` 可以写成 `space` 或 `/space`，最终都会规范化为 `/space`。不同模块不能占用同一个路由，否则构建配置会直接报错。

## 内容和命令

页面模块开启后，内容仍然按模块配置里的目录管理：

```bash
src/content/projects/
src/content/vibe/
src/content/media/
```

常用脚手架命令：

```bash
bun run post:new my-post
bun run project:new my-project
bun run vibe:new today-note
bun run media:new my-favourite-album
```

所有页面内容脚本都使用同一种格式：

```bash
bun run <页面简称>:new <文件名> [可选输出目录]
bun run post:new private-draft src/content/drafts
```

文件名经安全清理后同时作为输出 basename 和初始 `title`。未指定输出目录时，
`post` 使用 `src/content/blog/`，其余命令使用对应 page module 的默认目录。
`--md`、`--mdx` 或文件名扩展名可以覆盖默认扩展名。旧的 `content:new` 通用入口
仍可兼容已有工作流，但新增页面应注册并文档化自己的 `<页面简称>:new` 脚本。

`post` 是核心文章脚手架；`project`、`vibe` 与 `media` 来自启用的 page module。
如果对应模块被禁用，对应命令会停止创建文件并提示先启用模块。

### Projects 卡片元数据

Projects 条目默认使用 GitHub 图标。可在项目文章的 frontmatter 中设置 `icon`、`iconColor`、`authors` 和 `links`，让索引卡片在标题左侧展示图标，并在底部展示作者和仓库／平台入口：

```yaml
icon: rocket # github | box | code-2 | database | file-code-2 | globe-2 | layers-3 | palette | rocket | sparkles | terminal | wand-sparkles
iconColor: '#e86a33' # CSS 颜色、十六进制颜色或 var(--token)
authors:
  - name: 'Maggie Appleton'
    url: 'https://maggieappleton.com'
links:
  - label: 'GitHub'
    href: 'https://github.com/navfolio/astro-navfolio'
    kind: github # github | website | platform | docs | demo
```

不提供这些字段时，卡片仍可正常展示；`authors` 和 `links` 默认为空数组。

Projects 也支持与 Blog 相同的 `sticky` 语义：`sticky: true` 以默认优先级置顶，或用正数指定更高优先级；同级项目再按 `date` 从新到旧排列。新建项目默认写入 `sticky: false`。

## 自定义页面模块

自定义页面模块可以参考 `@navfolio/page-template`。最小模块通常声明 id、route、导航信息和可选的 route entrypoint：

```ts
export function customPageModule() {
  return {
    id: 'hello',
    route: '/hello',
    nav: { label: 'Hello', href: '/hello' },
    collections: ['hello'],
    routes: [
      {
        entrypoint: new URL('../routes/hello.astro', import.meta.url),
        prerender: true,
      },
    ],
    scaffold: {
      command: 'hello',
      collection: 'hello',
      directory: 'src/content/hello',
      defaultExtension: 'md',
      template: new URL('../templates/default.md', import.meta.url),
    },
  };
}
```

模块自己的静态 UI 文案应随模块发布，而不是加入主站的语言文件。用 `@navfolio/core` 的 `defineI18nContribution()` 定义 `en`、`zh-CN`、`zh-TW` catalog，并在模块返回值中提供 `i18n` 字段；`@navfolio/pages` 会收集已启用模块的 catalog。路由中可通过 `virtual:navfolio/page-runtime` 导出的 `getI18n(siteConfig)` 读取，例如 `i18n.t('hello.empty')`。

然后在站点里注册：

```ts
import { vibeModule } from '@navfolio/page-vibe';
import { pages, projectsModule } from '@navfolio/pages';
import { customPageModule } from '@your-scope/page-hello';

export default defineNavfolioConfig({
  plugins: [markdownPlugin(), pages()],
  modules: [projectsModule(), vibeModule(), customPageModule()],
});
```

如果模块需要创建内容文件，就在包内增加 `templates/default.md`。默认 frontmatter
和正文直接写在这个 Markdown 文件中：

```md
---
title: <%= title | yaml %>
date: <%= isoDate | yaml %>
draft: true
---

# <%= title %>
```

模板支持 `<%= title %>`、`<%= slug %>`、`<%= isoDate %>` 与 `<%= date %>`；
`| yaml` 会生成 YAML 安全的字符串。把这个目录加入包的 `files`，并在宿主
`package.json` 中把 scaffold 的 `command` 注册成标准脚本：

```json
{
  "scripts": {
    "hello:new": "bun scripts/new-content.ts hello"
  }
}
```

之后可以使用模块默认目录，或指定另一个输出目录：

```bash
bun run hello:new first-note
bun run hello:new first-note src/content/drafts
```

每个 page package 都拥有自己的默认 Markdown 模板，不再由宿主脚本通过
`article`、`project`、`vibe` 分支硬编码 frontmatter。

## 适合怎么取舍

建议把 page module 当成“页面级能力包”，而不是单纯的导航开关：

- 只是想改页面标题、说明文案、导航文本：改 `src/config/site.toml`。
- 想换页面路由、内容目录、脚手架命令：改 `navfolio.config.ts`。
- 想暂时关闭某个页面能力：把模块设为 `enabled: false`。
- 想彻底移除 Vibe 页面代码：删除模块注册并卸载 `@navfolio/page-vibe`。
- 想新增一类页面能力：参考 `@navfolio/page-template` 拆成单独的 `@navfolio/page-*` 包，再通过 `@navfolio/pages` 协议接入。

这个分工可以让内容配置保持易读，也让构建结果和你实际启用的功能保持一致。
