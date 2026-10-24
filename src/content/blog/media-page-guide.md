---
title: '书影音页面使用指南'
description: '使用 @navfolio/page-media，在一个可定位的页面里展示书籍、电影、剧集、专辑和播客。'
date: '2026-07-20T16:30:00+08:00'
draft: false
showHeroImage: false
tags:
  - Astro
  - Content
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

书影音页面由 `@navfolio/page-media` 提供，并通过 `@navfolio/pages` 的统一入口注册。它是一张单页媒体架：桌面端右侧会固定显示“书／影／音”锚点导航，手机端则收为页面顶部的章节导航。

## 启用页面

在 `navfolio.config.ts` 中从同一个包导入并注册：

```ts
import { mediaModule, pages, projectsModule, vibeModule } from '@navfolio/pages';

export default defineNavfolioConfig({
  modules: [projectsModule(), vibeModule(), mediaModule()],
  plugins: [pages()],
});
```

默认路由是 `/media`。可以改为更贴近个人站点的路径：

```ts
mediaModule({
  route: '/shelf',
  label: 'Media',
});
```

设置 `enabled: false` 或直接不注册 `mediaModule()`，都会同时移除路由、导航目标、内容集合与内容脚手架。

## 页面文字和导航

页面标题与说明写在 `src/config/site.toml`：

```toml
[config.pages.media]
title = "书影音"
subtitle = "读过、看过、听过的作品，以及一点当时的感受。"
note = "一页浏览书、电影、剧集、专辑与播客。"

[[config.topNav.links]]
label = "Media"
module = "media"
```

使用 `module = "media"` 后，即使将路由从 `/media` 改为 `/shelf`，顶部导航也会自动跟随，不需要重复修改 TOML。

## 内容目录与最小条目

条目位于：

```text
src/content/media/
```

可以用命令生成草稿：

```bash
bun run media:new my-favourite-book
bun run media:new my-favourite-book src/content/drafts
```

第一个参数同时作为文件名和初始 `title`；第二个目录参数可省略，省略时使用
`src/content/media/`。默认 frontmatter 与正文来自
`@navfolio/page-media/templates/default.md`。

每个条目是 Markdown 或 MDX 文件。最小可展示条目如下：

```md
---
title: 'The Left Hand of Darkness'
creator: 'Ursula K. Le Guin'
type: book
status: completed
completedAt: 2026-07-20
draft: false
---

这是一句简短的个人感受。
```

`type` 决定条目在哪一段展示和默认封面比例：

| 类型               | 分区 | 封面比例 |
| ------------------ | ---- | -------- |
| `book`             | 书   | 2:3      |
| `film`、`series`   | 影   | 16:10    |
| `album`、`podcast` | 音   | 1:1      |

## 字段说明

| 字段          | 类型              | 说明                                                                   |
| ------------- | ----------------- | ---------------------------------------------------------------------- |
| `title`       | string            | 必填，作品名称。                                                       |
| `creator`     | string            | 必填，作者、导演、音乐人或主播。                                       |
| `type`        | enum              | 必填：`book`、`film`、`series`、`album`、`podcast`。                   |
| `status`      | enum              | `completed`、`in-progress`、`planned`、`abandoned`；默认 `completed`。 |
| `completedAt` | date              | 可选，用于从新到旧排序。                                               |
| `cover`       | image / HTTPS URL | 可选封面；本地图片和远程 HTTPS 图片都可用。                            |
| `coverAspect` | enum              | 可选：`portrait`、`landscape`、`square`、`wide`；覆盖类型的默认比例。  |
| `rating`      | 1–5               | 可选评分，会以星级显示。                                               |
| `review`      | boolean           | 设为 `true` 时，正文会成为独立的 `/media/<slug>/` 长评页面。           |
| `tags`        | string[]          | 可选标签，便于后续扩展筛选。                                           |
| `externalUrl` | URL               | 可选外链；设置后整张卡片会在新标签页打开。                             |
| `draft`       | boolean           | 草稿不会在页面展示。                                                   |

正文用于保存简短感受。它不会把媒体架变成长文章，而是给条目留下一点个人语境。

## 发布书评、影评或乐评

当一条媒体内容需要完整的个人评论时，在 frontmatter 中设置 `review: true`，再直接在正文书写 Markdown 或 MDX。构建后会生成对应的 `/media/<slug>/` 页面；目录层级会保留，例如 `media/books/to-live.md` 会生成 `/media/books/to-live/`。

详情页沿用普通文章的阅读宽度与 Markdown 排版，但页首会先展示封面、作者／导演／艺人、年份、评分和标签，标题也会比正式博客页更紧凑。媒体架上的封面将出现“阅读长评”图标提示，并优先链接到这篇长评。

```md
---
title: '活着'
creator: '余华 · 1993'
type: book
cover: 'https://example.com/to-live-cover.jpg'
coverAspect: portrait
rating: 5
review: true
draft: false
---

## 活着不是结论

在这里继续写你的书评正文。
```

例如电影海报通常是竖版，即使 `type` 是 `film`，也可设置 `coverAspect: portrait`，让它和书籍一样按 2:3 展示；横幅剧照可使用 `landscape` 或更宽的 `wide`。

## 在文章中嵌入媒体条目

`MediaShelf` 是媒体页面使用的同一个展示组件，也可以在任意 MDX 文章里直接导入。默认的 `shelf` 变体会占满一行，将封面居中排成一面书架；用 `variant="inline"` 则改为适合正文宽度的无边框条目：左侧是封面，右侧可以容纳较长的介绍或点评，在手机上仍保持紧凑的双栏阅读节奏。

```astro
import MediaShelf from '@navfolio/mdx-components/MediaShelf.astro';

<MediaShelf
  variant="inline"
  items={[
    {
      title: 'The Left Hand of Darkness',
      creator: 'Ursula K. Le Guin',
      type: 'book',
      cover: '/images/media/the-left-hand-of-darkness.jpg',
      coverAspect: 'portrait',
      rating: 5,
      note: '严酷的行星设定让性别与亲密关系都变得陌生，读完后仍会反复想起。',
    },
  ]}
/>
```

文章中想只展示封面时，无需传 `variant`，或显式使用 `variant="shelf"`；可通过 `columns={2}` 到 `columns={5}` 调整桌面端列数。

## 接入微信读书

`@navfolio/weread-sync` 可以在 CI 中导出微信读书的公开书架快照，包括书名、作者、封面、完成状态、进度和深链。建议在构建阶段把这些字段映射为 `media` 条目或独立的数据层；评分和个人短评继续保存在站点内容中。

不要提交包含私密条目的原始同步快照，也不要把 API Key 写入内容文件。详情可见 [WeRead Sync](/blog/weread-sync/)。
