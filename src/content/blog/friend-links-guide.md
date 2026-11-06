---
title: '朋友页与友链卡片'
description: '维护友链分组、朋友圈聚合与友链申请：Sonder 的朋友页由数据文件和外挂标签卡片组成。'
date: '2026-05-19T00:00:00+08:00'
draft: false
heroImage: '/src/assets/figure/covers/cover-14-apricot.png'
showHeroImage: false
tags:
  - 外挂标签
  - 友链
  - 组件
categories:
  - 功能
comments: true
sidebar:
  enable: true
  toc: true
---


朋友页由三部分组成：友链分组、朋友圈聚合和友链申请。友链默认在 `src/data/friends.ts` 中维护；配置 `[config.youlin]` 后优先使用友邻接口，这份文件保留为回退数据。卡片视觉由主题组件统一渲染。

## 友链分组

```ts
export const friendLinkGroups = [
  {
    title: '技术伙伴',
    description: '写代码的人，和他们的博客。',
    items: [
      {
        name: '一叶之秋',
        url: 'https://example.com/blog',
        bio: '示例友链：记录折腾与思考',
      },
    ],
  },
];
```

每项支持 `name`、`url`、`bio`、`avatar`、`rss` 和 `sticky`。没有头像时，卡片会使用名称首字母作为占位。

## 在文章中使用卡片

`FriendLinkCard` 也可以在文章正文中直接使用：

::friend-link-card{src="demo" columns="3"}

## 朋友圈

朋友圈默认按以下顺序取数据：

1. 配置了 `[config.youlin]` 时，先读 `GET /api/circle`
2. `site.config.toml` 中 `[config.friendCircle].feed_src` 指向的订阅源
3. `public/friend-circle.json`（自行同步或生成的聚合文件）
4. 构建期抓取友链的 RSS / Atom
5. 内置演示数据 `src/data/friend-circle-demo.json`

```toml
[config.friendCircle]
feed_src = ""
pageSize = 20
```

`feed_src` 可以是 URL，也可以是 `public/` 下的文件路径。没有配置时，构建会尝试抓取友链里带 `rss` 的站点；全部失败则展示演示数据。Youlin 的 200 空结果视为有效空态，不会用演示数据覆盖。

## 接入友邻

把友链和朋友圈交给 [友邻](https://github.com/lmb666666/youlin) 管理：

```toml
[config.youlin]
baseUrl = "https://youlin.example.com"
mode = "build" # build | client

[config.youlin.links]
sources = ["youlin", "local"]

[config.youlin.circle]
sources = ["youlin", "friendcircle", "public", "rss", "demo"]
```

`baseUrl` 留空时不会请求友邻，行为与纯本地模式一致。完整配置、`apply.provider`、构建期 / 浏览器模式与文章指令的 `src="youlin"` 用法见[站点配置指南](/blog/site-config-guide/)。

## 友链申请

默认由 `site.repository` 指向的 GitHub 仓库生成 Issue。仓库地址为空或不可解析时，申请区不会显示。提交的 Issue 通过 `friend-link` 标签归档，博主确认后把友链加入 `src/data/friends.ts`。

配置 `[config.youlin].apply.provider = "youlin"`（或 `auto` + `baseUrl`）后，申请入口改为 Youlin `/apply`。文章里的 `::friend-link-application` 默认跟随全局 provider，也可以用 `provider="github"` / `provider="youlin"` 单点覆盖。

朋友页的标题、kicker 和副标题在 `site.config.toml` 的 `[config.pages.links]` 中配置。
