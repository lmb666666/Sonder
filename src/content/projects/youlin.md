---
title: 'Youlin'
description: '自托管的友链与朋友圈服务。'
date: '2026-10-20T00:00:00+08:00'
draft: false
showHeroImage: false
icon: 'database'
iconColor: 'var(--paper-accent)'
links:
  - label: '网站'
    href: 'https://youlin.liang.one'
    kind: website
tags:
  - Hono
  - SQLite
  - Docker
comments: false
sidebar:
  enable: false
  toc: false
---

Youlin 是一个自托管的友链与朋友圈服务。它把友链申请、朋友圈订阅和朋友页数据收在自己的服务器里，Sonder 通过接口读取并在构建期生成静态页面。

项目使用 Hono 提供服务端接口，SQLite 保存数据，Docker 负责部署。它让朋友页不再依赖第三方托管，也保留了随时迁移的余地。
