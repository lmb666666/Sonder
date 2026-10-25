---
title: '站点配置指南'
description: 'Sonder 的站点级信息集中在 src/config/site.toml：站点、作者、导航、页面文案、首页、外观、搜索、评论和朋友圈。'
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
  relatedPosts: true
---

Sonder 把站点级信息集中在 `src/config/site.toml`，而不是散落在组件里。配置结构由 `src/content.config.ts` 中的 Zod schema 校验；字段缺失或类型不对时，`bun run build` 会直接报错。

## 站点与作者

```toml
[config.site]
title = "Sonder"
description = "Sonder 的个人博客。"
pageTitle = "Sonder | 万千人生，各自成书"
url = "https://sonder.liang.one"
repository = "https://github.com/lmb666666/Sonder"
timeEstablished = "2026-10-04"

[config.profile]
name = "Sonder"
handle = "@sonder"
role = "每个人都有自己的故事"
email = "hello@sonder.liang.one"
website = "https://sonder.liang.one"
github = "https://github.com/lmb666666/Sonder"
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
palette = "blue-soft"
lang = "zh-CN"
navStyle = "pill"
```

- `palette`：默认色盘，可选 `green-soft`、`green-vivid`、`rose-soft`、`pink-soft`、`purple-soft`、`blue-soft`、`orange-soft`、`brown-soft`
- `lang`：`zh-CN`、`zh-TW` 或 `en`
- `navStyle`：`pill` 胶囊导航或 `bar` 通栏工具条

顶部导航由 `[[config.topNav.links]]` 控制，可以写普通 `href`，也可以引用已启用的页面模块。

## 页面文案

页面标题、kicker 和说明都在 `[config.pages]` 下：

```toml
[config.pages.blog]
title = "文章"
kicker = "归档"
subtitle = "每个人都有自己的故事。"
listLayout = "media"

[config.pages.links]
title = "朋友"
kicker = "Friends"
subtitle = "那些人，那些事。"
```

文章页的 `listLayout = "media"` 会使用带封面的磨砂卡片；改成 `rows` 则回到行式列表。`postsPerPage` 控制每页文章数。

## 首页

```toml
[config.home.latest]
count = 2
heatmapWeeks = 20
showHeatmapLatest = true
```

`count` 控制首页「最新」展示的文章数量。首页引语、介绍、导航卡片和联系方式分别在 `[config.home.quote]`、`[config.home.intro]`、`[[config.home.navigation]]` 与 `[[config.home.links]]` 中维护。

## 搜索、评论与朋友圈

```toml
[config.search]
enabled = true
shortcut = "mod+k"
placeholder = "搜索文章…"
maxResults = 6

[config.comments]
enabled = false

[config.friendCircle]
feed_src = ""
pageSize = 20
```

评论支持 giscus、utterances、Waline、Twikoo 或关闭；具体凭据在对应的 `[config.comments.*]` 区块中填写。朋友页的 `feed_src` 可以指向 Friend-Circle-Lite 订阅源，也可以留空使用 `public/friend-circle.json` 或构建期 RSS 聚合。

## 模块配置

页面模块在 `sonder.config.ts` 中注册。当前启用的是书影音模块：

```ts
import { mediaModule, pages } from './src/modules';

export default defineSonderConfig({
  modules: [mediaModule()],
  plugins: [pages()],
});
```

项目卡片直接读取 `src/content/projects/`，由关于页展示，不依赖单独的项目路由；短记录统一使用 `/moments`。
