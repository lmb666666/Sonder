---
title: '关于 Sonder'
description: 'Sonder 是一份以纸面阅读感为核心的个人发布模板，用 Astro 与 Bun 把长文、书影音、动态和朋友页收在一处。'
date: '2026-05-01T00:00:00+08:00'
draft: false
showHeroImage: false
tags:
  - About
  - Sonder
comments: false
sidebar:
  enable: false
  toc: false
---


Sonder 是一份安静的个人发布模板。它不把首页做成营销落地页，而是把身份、近况、写作和阅读痕迹放在同一张纸面上：左侧是正文与最新文章，右侧是身份、统计、热力图和站点信息。

模板基于 Astro 静态构建，使用 Bun 运行脚本，内容由 Markdown 管理。没有后端依赖，也没有复杂的状态管理；所有页面在构建时生成，适合部署到 GitHub Pages、Vercel、Netlify、Cloudflare Pages 或任意静态托管平台。

## 这里有什么

- **文章**：文章卡片使用 16:9 封面和磨砂文字条，支持分类、标签、目录、上下篇、更多文章和深色模式。
- **书影音**：书籍、电影、剧集、专辑与播客的媒体架，按类型分区浏览。
- **动态**：按时间排列的短记录，可切换为 Ech0 数据源。
- **朋友**：友链分组与朋友圈聚合，支持 RSS 同步和友链申请。
- **个人资料**：头像、身份、社交链接和站点信息都可以在 `site.config.toml` 中维护。

## 从哪里开始

1. 阅读 [Sonder 快速开始](/blog/get-start/)。
2. 在 `site.config.toml` 里替换站点标题、作者资料、导航和首页文案。
3. 在 `src/content/` 下编辑或删除示例内容。
4. 运行 `bun run build`，把 `dist/` 部署到你的托管平台。

视觉上，模板尽量保持克制：纸面底色、发丝线、低饱和色盘和轻量动效。需要调整时，优先改主题色盘与 CSS 变量，而不是在每个页面里单独覆盖样式。

## 相关链接

::friend-link-card{src="demo" columns="3"}
