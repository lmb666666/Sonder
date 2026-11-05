---
title: '站内搜索'
description: 'Sonder 使用 Pagefind 生成静态全文索引，支持顶部搜索按钮与 Ctrl+K / Cmd+K 快捷键。'
date: '2026-05-21'
draft: false
heroImage: '/src/assets/figure/covers/cover-13-steel.png'
showHeroImage: false
tags:
  - Pagefind
  - 搜索
  - Astro
categories:
  - 功能
comments: true
sidebar:
  enable: true
  toc: true
---

站内搜索使用 Pagefind 生成静态索引，不需要后端服务，也不需要把全文提前打包进页面。生产构建结束后，搜索脚本从 `dist/pagefind` 按需加载索引。

## 打开搜索

顶部导航里有搜索按钮；点击后打开搜索弹层，输入框自动获得焦点。也可以直接使用快捷键：

- Windows / Linux：`Ctrl+K`
- macOS：`Cmd+K`

按 `Esc` 或点击弹层外部关闭。

## 配置

```toml
[config.search]
enabled = true
placeholder = "搜索文章…"
maxResults = 6
```

- `enabled`：是否显示搜索入口；快捷键固定为 `Ctrl/Cmd + K`
- `placeholder`：输入框提示
- `maxResults`：一次展示的结果数量

## 构建索引

搜索索引由构建脚本生成：

```bash
bun run build
```

构建会先执行 Astro 静态构建，再运行 Pagefind 扫描 `dist`。文章正文、动态、书影音和普通页面都会进入索引；导航、页脚等标记了 `data-pagefind-ignore` 的区域不会。

搜索结果会根据路径归类为文章、项目或普通页面。索引文件随静态站点一起发布，不需要额外的数据库或服务。
