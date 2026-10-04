---
title: 使用指南
author: Sonder
description: 从环境准备、站点配置到写完第一篇文章并发布上线，Sonder 的完整上手流程。
date: 2026-10-04
updated: 2026-10-04
postid: guide
type: tech
categories:
  - 笔记
tags:
  - 指南
  - 配置
  - 部署
image: /images/cover.svg
recommend: 1
draft: false
---

> 📖 欢迎使用 Sonder！这篇指南会带你把博客从零跑起来、改成自己的模样，再把第一篇文章发出去。写作技巧和组件用法在[写作手册](/posts/writing)。

## 🛠️ 准备环境

先备好 Node.js 24 和 pnpm 11.18.0——固定版本能省掉大多数莫名其妙的报错。还没装 pnpm 的话补上：

```sh
node --version
npm install --global pnpm@11.18.0
pnpm --version
```

看到 `v24.x.x` 和 `11.18.0` 就可以继续。项目声明的范围是 Node `^22.5 || ^23.6 || >=24`、pnpm `>=10`，下面的命令都在项目根目录执行。

接着安装依赖、启动开发服务器：

::copy{code="pnpm install --frozen-lockfile && pnpm exec nuxt dev --host 127.0.0.1"}
::

浏览器打开终端给出的地址，默认是 `http://127.0.0.1:3000`。安装时 `prepare` 会先清理 `.data` 和依赖缓存再执行 `nuxt prepare`，所以第一次启动会慢一点。

::folding{title="开发环境的几个小细节"}
- `pnpm dev` 会自动打开浏览器；上面的命令只绑定本机，适合远程服务器。
- 草稿文章在开发环境可以直接访问，生产构建会被过滤，但草稿不是加密，别放隐私内容。
- 冻结安装失败时先核对 Node 和 pnpm 版本，不要直接删锁文件。
::

## 📂 目录速览

写文章打交道的主要是这几个位置，先认个脸熟：

| 位置 | 干什么的 |
| --- | --- |
| `content/posts/` | 文章 Markdown，可以按年份建子目录 |
| `public/` | 静态资源，`public/images/cover.svg` 在文章里写成 `/images/cover.svg` |
| `blog.config.ts` | 日常配置入口：站点身份、主页、分类、导航、服务开关 |
| `content/data/friend-feeds.ts` | 友链数据 |
| `app/components/content/` | 文章里能用的组件，写法见[写作手册](/posts/writing) |

## ⚙️ 站点配置

打开根目录的 `blog.config.ts`，它是日常配置的唯一入口。先把 `basicConfig` 里的占位信息换成你自己的：

```ts
const basicConfig = {
  title: '我的博客',
  subtitle: '一句话副标题',
  description: '网站简介，搜索引擎摘要也会用它',
  author: {
    name: '你的名字',
    avatar: '/images/avatar.svg',
    email: 'you@example.com',
    homepage: 'https://example.com',
  },
  url: 'https://blog.example.com',
}
```

::alert{type="warning" title="url 别写错"}
`url` 要写完整的 HTTPS 地址、不带末尾斜杠，它决定 canonical、sitemap 和订阅里的绝对链接。示例文章 Front Matter 里的 `author: Sonder` 也记得一起替换成自己的名字。
::

其余配置按需改，每项都在注释里说明了用途：

| 配置 | 作用 |
| --- | --- |
| `home.mode` | `'home'` 个人主页，`'articles'` 文章列表；各区块用 `home.sections` 开关 |
| `article.categories` | 分类名到图标、颜色的映射，文章里用到的分类必须在这里存在 |
| `nav` / `footer.nav` | 侧边栏和页脚导航，条目是 `{ icon, text, url }` |
| `theme.default` | `system` / `light` / `dark` |
| `pagination.perPage` | 列表每页文章数 |

改完跑一遍配置审计：

::copy{code="pnpm audit:config"}
::

## 🔗 友链

友链数据在 `content/data/friend-feeds.ts`，按分组组织。`app/feeds.ts` 会自动把本站信息插到第一组首位，不用手动复制：

```ts
const group = {
  name: '朋友们',
  desc: '在这里添加你关注的博客。',
  entries: [
    {
      author: '朋友的名字',
      title: '朋友的博客',
      desc: '一句话介绍',
      link: 'https://example.org',
      feed: 'https://example.org/atom.xml',
      icon: '/images/avatar.svg',
      avatar: '/images/avatar.svg',
      date: '2026-10-04',
    },
  ],
}
```

友链页的标题、Tab 文案在 `pages.link` 里配置，页面正文（申请方式等）在 `content/link.md`。需要 JSON 数据喂给外部工具时运行 `pnpm generate-friend-json`，生成 `public/friend.json`。

## 🔌 可选服务

评论、动态、朋友圈、音乐默认都是关的。它们各自依赖一个独立部署的服务，准备好端点再逐项开启：

| 功能 | 依赖的服务 | 配置 |
| --- | --- | --- |
| 评论 | [Twikoo](https://github.com/imaegoo/twikoo) | `features.comments.enabled` 与 `twikoo.envId` / `script` / `preload` |
| 动态 | [Ech0](https://github.com/lin-snow/Ech0) | `features.moments.enabled` + `apiUrl` |
| 朋友圈 | [Friend-Circle-Lite](https://github.com/willow-god/friend-circle-lite) | `features.circle.enabled` + `apiUrl` |
| 歌曲解析 | [Meting API](https://github.com/metowolf/Meting) | `features.music.metingApis` |

动态和朋友圈是两个独立部署的小服务：Ech0 负责你自己的动态时间线，Friend-Circle-Lite 负责聚合友链站点的文章更新，都需要单独搭好后把地址填进 `apiUrl`。

::alert{type="info" title="关于外部请求"}
开启服务后页面会向对应端点发请求；KaTeX 样式来自 CDN，文章里的远程图片和自定义脚本也会联网。关掉全部可选服务不等于页面完全离线。
::

搜索和「分享为文字」按钮分别由 `features.search.enabled`、`features.share.enabled` 控制。

## ✍️ 写文章

用交互式脚本创建，它会问分类、标签、版式，写入当前年份目录：

```sh
pnpm new
pnpm new my-first-post
```

文章开头的 Front Matter 长这样：

```yaml
---
title: 我的第一篇文章
description: 一句话说清这篇写了什么。
date: 2026-10-04
updated: 2026-10-04
postid: my-first-post
type: tech
categories: [笔记]
tags: [随笔]
draft: false
---
```

| 字段 | 说明 |
| --- | --- |
| `title`、`date`、`description` | 审计要求非空 |
| `postid` | 文章唯一 ID，决定网址 `/posts/<postid>`，发布后不要改 |
| `type` | `tech` 技术版式，`story` 居中的故事版式 |
| `categories` / `tags` | 分类须在配置里存在，标签自由填 |
| `draft` | 布尔值，`true` 时只在开发环境可见 |
| `image` | 封面，不填用 `ui.article.fallbackCover` |
| `recommend` | 数字，进入首页推荐轮播（`0` 也算） |

给已发布文章换 `postid` 会让旧链接 404，必要时在 `redirects.json` 里补一条映射。发布后想确认文章能被搜到，按 :key{code="K" ctrl} 打开站内搜索，输入标题试试。

## 🚀 上线

正文写完、`draft` 都改成 `false` 之后，发布前跑一遍审计：

::copy{code="pnpm audit:config && pnpm audit:content"}
::

两种部署方式按需选。

**静态托管（SSG）**——把 `.output/public/` 整个目录传上去，托管平台需要支持 `/posts/<postid>/index.html` 这样的目录索引：

```sh
pnpm generate
pnpm audit:dist
```

**自己的服务器（SSR）**——保留完整的 `.output/`，用进程管理器常驻：

```sh
pnpm build
NITRO_HOST=127.0.0.1 NITRO_PORT=3000 node .output/server/index.mjs
```

域名和路径在生成时就写死了，换域名后要重新生成。仓库里的 `edgeone.json` 是一份 EdgeOne 部署示例，其他平台按需自行配置。

---

到这里站点就跑起来了。接下来去[写作手册](/posts/writing)看看文章里能玩出哪些花样吧。
