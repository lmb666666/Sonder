---
title: 'Sonder 快速开始'
description: '从本地运行到部署上线：准备环境、修改站点配置、替换示例内容，并生成可发布的静态站点。'
date: 2026-07-05T08:13:22.188Z
heroImage: '/src/assets/figure/covers/cover-01-sage.png'
draft: false
sticky: true
showHeroImage: false
tags:
  - Astro
  - Bun
  - 部署
categories:
  - 入门
comments: true
sidebar:
  enable: true
  toc: true
---

Sonder 是一份以纸面阅读感为核心的个人发布模板，使用 Astro 静态构建、Bun 运行脚本。它把文章、书影音、动态、朋友页和个人资料收在同一套版式里，适合作为长期写作与个人出版的起点。

## 环境准备

- Node.js 22.12 或更高版本
- Bun（推荐用于安装依赖和运行脚本）
- 一个静态托管平台（GitHub Pages、Vercel、Netlify、Cloudflare Pages 等）

```bash
git clone https://github.com/lmb666666/Sonder.git
cd Sonder
bun install
bun run dev
```

开发服务器默认运行在 `http://localhost:4321`。修改内容或样式后会热更新。

## 先改站点信息

打开根目录的 `site.config.toml`，优先替换这些值：

- `[config.site]`：站点标题、描述、线上地址、仓库地址和页脚说明
- `[config.profile]`：作者名、身份、头像、邮箱、网站和 GitHub
- `[[config.topNav.links]]`：顶部导航链接
- `[config.theme]`：默认色盘、界面语言和导航样式
- `[config.home]`：首页引语、介绍、最新文章数量和联系方式

每项的完整说明见 [站点配置指南](/blog/site-config-guide/)。

## 替换内容

内容都在 `src/content/` 下：

```text
src/content/
  about.md         关于页
  blog/            长文与教程
  media/           书、影、音条目
  projects/        关于页的项目卡片
```

示例文章可以直接编辑或删除。删除文章后，记得把文章里的 `heroImage` 对应的封面一起清理，避免残留未使用的图片。

文章 frontmatter 的 `date` 是发布时间；需要显示修改时间时，再加一行 `updated: 2026-11-08`。文章页只会在修改时间比发布时间晚至少一天时显示「修改于」，站点信息卡的「最后更新」也会取两者的最大值。

关于页的内容在 `src/content/about.md`。`lede` 是首屏引语；`journey`、`skills` 和 `tools` 分别控制经历、技能与技术栈；`tools` 的 `short` 是胶囊缩写，`color` 与 `text` 控制底色和文字颜色。头像在 `public/images/about-avatar.png`，项目截图在 `src/assets/figure/projects/`，最近文章自动取博客集合，AI Token 数据在 `src/data/token-usage.ts`。

动态页的演示数据在 `src/data/moments.ts`；朋友页的友链与朋友圈演示数据在 `src/data/`。

## 构建与部署

```bash
bun run build
bun run preview
```

构建会把静态页面输出到 `dist/`。部署时只需要把 `dist/` 交给任意静态托管平台；仓库内置的 `vercel.json` 可以在推送到 `main` 时自动构建；其他平台直接发布 `dist/` 即可。

如果站点部署在子路径，可以在构建时设置：

```bash
SITE_URL=https://example.com SITE_BASE=/my-site bun run build
```

## 接下来

- 阅读 [主题色与深色模式](/blog/theme-palettes/)，调整默认色盘与导航样式。
- 阅读 [内容组件速览](/blog/components-showcase/)，了解文章里可以使用的全部外挂指令。
- 阅读 [书影音页面](/blog/media-page-guide/)、[站内搜索](/blog/site-search-guide/) 和 [朋友页与友链卡片](/blog/friend-links-guide/) 的配置方式。
