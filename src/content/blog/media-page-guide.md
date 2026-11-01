---
title: '书影音页面'
description: '用 Sonder 的媒体架展示书籍、电影、剧集、专辑与播客，并配置分区导航和阅读长评。'
date: '2026-07-20T16:30:00+08:00'
draft: false
heroImage: '/src/assets/figure/covers/cover-08-cocoa.png'
showHeroImage: false
tags:
  - Astro
  - 书影音
  - 内容
categories:
  - 功能
comments: true
sidebar:
  enable: true
  toc: true
---

书影音页面把读过的书、看过的电影、追过的剧、听过的专辑和播客放在一张按类型分区的媒体架上。桌面端右侧固定显示「书／影／音」章节导航，移动端收为页面顶部的章节标签。

## 页面配置

页面标题、kicker 和说明在 `site.config.toml` 中：

```toml
[config.pages.media]
title = "书影音"
kicker = "Media"
subtitle = "读过、看过、听过的作品。"
note = ""
```

书架、影视、音乐三个分区由媒体模块自动汇总，不需要手动维护分区顺序。

## 条目内容

内容放在 `src/content/media/` 下：

```text
src/content/media/
  books/
  films/
  music/
```

每个条目是一份 Markdown 文件：

```yaml
---
title: '你当像鸟飞往你的山'
creator: 'Tara Westover · 2018'
type: book
status: completed
completedAt: 2026-07-20
cover: 'https://example.com/cover.jpg'
rating: 5
tags: [回忆录, 教育]
draft: false
---
```

- `type`：`book`、`film`、`series`、`album`、`podcast`
- `status`：`completed`、`in-progress`、`planned`、`abandoned`
- `cover`：本地图片或远程图片地址
- `review: true` 时，条目会生成阅读长评页面

## 页面与集合

书影音是普通页面与内容集合，开箱即用，不需要注册：`src/pages/media/` 提供路由，`src/content/media/` 存放条目。不需要书影音时，删除这两个目录即可，导航项同步从 `site.config.toml` 移除。

新增条目可以使用：

```bash
bun run media:new the-left-hand-of-darkness
```

如果不需要书影音页面，可以从 `modules` 中移除 `mediaModule()`，并删除 `src/content/media/` 下的示例内容。
