---
title: '站点配置指南'
description: 'Sonder 的站点级信息集中在根目录的 site.config.toml：站点、作者、导航、页面文案、首页、外观、搜索、评论和朋友圈。'
date: '2026-05-19T18:00:00+08:00'
draft: false
heroImage: '/src/assets/figure/covers/cover-07-teal.png'
showHeroImage: false
tags:
  - TOML
  - 配置
  - Astro
categories:
  - 配置
comments: true
sidebar:
  enable: true
  toc: true
---

Sonder 把站点级信息集中在根目录的 `site.config.toml`，而不是散落在组件里。配置结构由 `src/config/schema.ts` 中的 Zod schema 校验；字段缺失或类型不对时，`bun run build` 会直接报错。

## 站点与作者

```toml
[config.site]
title = "Sonder"
description = "Sonder 的个人博客。"
pageTitle = "Sonder"
url = "https://sonder.liang.one"
repository = "https://github.com/lmb666666/Sonder"
timeEstablished = "2026-10-04"

[config.profile]
name = "Sonder"
role = "写博客的人"
avatar = "/images/logo.svg"
```

页脚与桌面首页署名读取 `profile.name`；站点程序名读取 `siteInfo.program`。

## 站点信息卡

```toml
[config.siteInfo]
title = "站点信息"
program = "Sonder"
uptime = true
lastUpdated = true
buildPlatform = true
```

`program` 会显示为「站点程序」一行，也用于页脚的 Powered by；留空时两处一起隐藏。`uptime`、`lastUpdated` 和 `buildPlatform` 控制其余信息行。

## 导航与外观

```toml
[config.theme]
palette = "orange-soft"
lang = "zh-CN"
navStyle = "pill"
```

- `palette`：默认色盘，可选 `green-soft`、`green-vivid`、`rose-soft`、`pink-soft`、`purple-soft`、`blue-soft`、`orange-soft`、`brown-soft`
- `lang`：`zh-CN`、`zh-TW` 或 `en`
- `navStyle`：`pill` 胶囊导航或 `bar` 通栏工具条

顶部导航由 `[[config.topNav.links]]` 控制，每项填写 `label` 与 `href`。

## 字体与代码块

```toml
[config.fonts]
en = "Maple Mono"
code = "Monaco"
zh = "ChillRoundF"
file = "assets/fonts/ChillRoundFRegular.woff2"

[config.code]
lineNumbers = true
wrap = false
preserveIndent = true
collapseStyle = "collapsible-auto"
languageBadge = true
collapseLines = 15
previewLines = 8
```

- `fonts.file`：构建期源字体，仅用于生成 `public/fonts` 下的 UI / 内容子集，本身不会部署。
- `code.wrap`：桌面端是否自动换行；`false` 时横向滚动，窄屏仍由样式强制换行。
- `code.languageBadge`：是否在代码块右上角显示语言徽章。
- `code.collapseLines` / `previewLines`：超过指定行数自动折叠，以及折叠时预览的行数。
- 代码块主题固定为纸面主题，token 颜色跟随色盘与深浅色，无需配置主题名。

## 页面文案

页面标题、kicker 和说明都在 `[config.pages]` 下：

```toml
[config.pages.blog]
title = "文章"
kicker = "归档"
subtitle = "长文与随想的归档。"
listLayout = "media"

[config.pages.links]
title = "朋友"
kicker = "Friends"
subtitle = "那些人，那些事。"
```

文章页的 `listLayout = "media"` 会使用带封面的磨砂卡片；改成 `rows` 则回到行式列表。`postsPerPage` 控制每页文章数。

## 文章页组件

```toml
[config.article]
share = true
navigation = true
morePosts = true
```

- `share`：文章底部分享卡片
- `navigation`：上一篇 / 下一篇
- `morePosts`：更多文章列表

## 首页

```toml
[config.home.latest]
count = 2
heatmapWeeks = 20
showHeatmapLatest = true
```

`count` 控制首页「最新」展示的文章数量。首页引语、介绍和联系方式分别在 `[config.home.quote]`、`[config.home.intro]` 与 `[[config.home.links]]` 中维护。

## 搜索、评论与朋友圈

```toml
[config.search]
enabled = true
placeholder = "搜索文章…"
maxResults = 6

[config.comments]
enabled = false

[config.friendCircle]
feed_src = ""
pageSize = 20
```

评论支持 giscus、utterances、Waline、Twikoo 或关闭；具体凭据在对应的 `[config.comments.*]` 区块中填写。朋友页的 `feed_src` 可以指向 Friend-Circle-Lite 订阅源，也可以留空使用 `public/friend-circle.json` 或构建期 RSS 聚合。

## 友邻（Youlin）

可选接入 [友邻](https://github.com/lmb666666/youlin)：友链和朋友圈改由 Youlin 接口提供，本地数据与 `friendCircle` 配置保留为回退。

```toml
[config.youlin]
baseUrl = "https://youlin.example.com"
timeoutMs = 8000
mode = "build" # build | client

[config.youlin.links]
sources = ["youlin", "local"]

[config.youlin.circle]
sources = ["youlin", "friendcircle", "public", "rss", "demo"]

[config.youlin.apply]
provider = "auto" # auto | youlin | github | none
# Youlin 开启 Turnstile 时填写它的公开 site key
turnstileSiteKey = ""

[config.youlin.directives]
friendCircle = "auto"
friendLinkCard = "auto"
```

- `baseUrl` 为空时完全沿用原有本地链路，不会发出任何 Youlin 请求。
- `sources` 按顺序尝试：只有网络/HTTP/解析失败才继续下一个源；Youlin 返回 200 且 JSON 合法即采用（空结果也有效）。
- `mode = "build"` 在构建期 SSR，SEO 与 Pagefind 覆盖最好；`mode = "client"` 先渲染构建期回退，浏览器再请求 Youlin 替换 DOM。可在 `links` / `circle` 下单独覆盖。
- `apply.provider = "auto"` 时，配了 `baseUrl` 就用 Youlin 的 `/apply` 接口：表单在当前页面直接 POST，不跳转；开启 Turnstile 时把公开 site key 填到 `turnstileSiteKey`。也可强制 `github` / `none`。
- 文章里的 `::friend-circle{src="youlin"}` 与 `::friend-link-card{src="youlin"}` 同样可用；不写 `src` 时取 `directives.*` 的默认值。
- 环境变量是覆盖层：`SONDER_YOULIN_BASE_URL` 覆盖地址，`SONDER_YOULIN_MODE` 覆盖全局以及 `links` / `circle` 的 mode；无效值会被忽略并回退 TOML。适合 CI 或预览环境。复用本地 Astro 内容缓存时，如果发现文章内指令没有跟随新配置，用 `bunx astro build --force` 重建。
- build 模式下数据变化需要重新构建：可以在 Youlin 设置 `rebuild.*` webhook / GitHub dispatch 触发本站构建，或手动重建。

## Markdown 开关

`[config.markdown]` 控制数学公式与 Mermaid 图表：

```toml
[config.markdown]
math = true
mathRenderer = "katex" # "katex" | "mathjax"
mermaid = true
```

提醒块、外挂指令与响应式表格始终开启——文章内容依赖它们，因此不提供开关。

## 页面与集合

书影音、动态、朋友页都是普通页面加内容集合，不需要注册：删除 `src/pages/media/` 与 `src/content/media/` 即移除书影音，导航项同步从 `site.config.toml` 删除。项目卡片直接读取 `src/content/projects/`，由关于页展示；没有独立项目页。短记录统一使用 `/moments`。
