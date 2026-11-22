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


朋友页由三部分组成：友链分组、朋友圈聚合和友链申请。友链默认在 `src/data/friends.yml` 中维护；配置 `[config.integrations.youlin]` 后优先使用友邻接口，这份文件保留为回退数据。卡片视觉由主题组件统一渲染。

## 友链分组

```yaml
friends:
  groups:
    - title: 技术伙伴
      description: 写代码的人，和他们的博客。
      items:
        - name: 一叶之秋
          url: https://example.com/blog
          bio: 示例友链：记录折腾与思考
```

每项支持 `name`、`url`、`bio`、`avatar`、`rss` 和 `sticky`。没有头像时，卡片会使用名称首字母作为占位。

## 在文章中使用卡片

`FriendLinkCard` 也可以在文章正文中直接使用：

::friend-link-card{src="demo" columns="3"}

## 朋友圈

朋友圈先打开开关并选择渠道：

```toml
[config.integrations.friends]
# 是否显示朋友圈
enable = true
# fcl（Friend-Circle-Lite）| youlin（友邻）| none
provider = "fcl"
# 每次展示条数
pageSize = 20

[config.integrations.friends.fcl]
# provider = "fcl" 时必填：FCL 的 all.json 地址
apiUrl = "https://fcl.example.com/all.json"
```

- `provider = "fcl"`：浏览器请求 FCL 的 `all.json`，支持 `article_data` / `link` / `created` 和 `statistical_data`。
- `provider = "youlin"`：在 `[config.integrations.youlin]` 中填写 `baseUrl`，浏览器请求 `{baseUrl}/api/circle`。
- `provider = "none"` 或 `enable = false`：不显示朋友圈区域。
- FCL 实例需要允许当前站点域名跨域。

启用 `provider = "fcl"` 时，构建会自动运行 `friends:json`，从 `src/data/friends.yml` 生成 `public/friend.json`（部署为 `/friend.json`）；模板里的 `example.*` 占位友链会被跳过。不使用 FCL 时不会生成。把 FCL 的 `json_url` 指向它，例如：

```yaml
# Friend-Circle-Lite 配置
spider_settings:
  json_url: "https://sonder.example.com/friend.json"
```

## 接入友邻

把友链和朋友圈交给 [友邻](https://github.com/lmb666666/youlin) 管理：

```toml
[config.integrations.friends]
enable = true
provider = "youlin"

[config.integrations.youlin]
baseUrl = "https://youlin.example.com"
# 只影响友链取数；朋友圈始终由浏览器请求
mode = "build"

[config.integrations.youlin.links]
sources = ["youlin", "local"]

[config.integrations.youlin.circle]
limit = 0
```

`baseUrl` 留空时不会请求友邻，行为与纯本地模式一致；但 `friends.provider = "youlin"` 时构建会要求填写 `baseUrl`。朋友圈始终请求 `{baseUrl}/api/circle`，不做构建期抓取。完整配置、`apply.provider` 与文章指令的 `src="youlin"` 用法见[站点配置指南](/blog/site-config-guide/)。

## 友链申请

默认由 `site.repository` 指向的 GitHub 仓库生成 Issue。仓库地址为空或不可解析时，申请区不会显示。提交的 Issue 通过 `friend-link` 标签归档，博主确认后把友链加入 `src/data/friends.yml`。

配置 `[config.integrations.youlin].apply.provider = "youlin"`（或 `auto` + `baseUrl`）后，申请表单直接 POST 到 Youlin `/apply`，页面不跳转；开启 Turnstile 时把公开 site key 填到 `turnstileSiteKey`。文章里的 `::friend-link-application` 默认跟随全局 provider，也可以用 `provider="github"` / `provider="youlin"` 单点覆盖。

朋友页的标题、kicker 和副标题在 `site.config.toml` 的 `[config.pages.links]` 中配置。
