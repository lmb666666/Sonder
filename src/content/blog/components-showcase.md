---
title: 'Sonder 组件速览'
description: 'Sonder 目前提供的二十个 MDX 内容组件——徽标、按键、剧透、诗歌、卡片、选项卡、聊天、链接、友链、轮播、长图、媒体架、图表、视频、音乐与乐谱——一篇看全。'
date: '2026-10-25T00:00:00+08:00'
heroImage: '/src/assets/figure/covers/cover-09-ink.png'
draft: false
showHeroImage: false
postid: components-showcase
tags:
  - 组件
  - MDX
  - 指令
categories:
  - 功能
comments: true
sidebar:
  enable: true
  toc: true
references:
  - title: 'abcjs —— 标准 ABC 记谱法的 JavaScript 渲染与合成库'
    link: 'https://paulrosen.github.io/abcjs/'
  - title: 'Sonder v1 组件源码'
    link: 'https://github.com/lmb666666/Sonder'
---


Sonder 提供一套外挂指令语法与二十个 MDX 组件。这篇速览把每一种写法都放进真实文章里跑一遍；
frontmatter 里也用到了模板扩展的 `postid` 与 `references` 字段（见文末参考链接）。

## 行内组件

### Badge 徽标

带图标与链接的行内徽标；不传 `img` 时会自动取 GitHub 头像或站点 favicon。

:badge[Astro]{href="https://astro.build"}
:badge[GitHub]{href="https://github.com/lmb666666/Sonder"}
:badge[纯文字徽标]
:badge[带图圆形]{img="https://github.com/lmb666666.png?size=64" href="https://github.com/lmb666666"}

### Key 按键

快捷键按键展示，macOS 自动切换为符号；在页面上真实按下对应组合键时，按键会亮起。

复制 :key[Ctrl] + :key[C]；搜索 :key[Cmd] + :key[K]；全选 :key[Ctrl] + :key[Shift] + :key[A]

### Blur 剧透模糊

默认模糊，悬停、聚焦或按住时显形——剧透警告：:blur[他是凶手]。

## 排版与结构

### Poetry 诗歌排版

:::poetry[俳句一则|示例]{footer="—— 匿名"}
旧博客沉去
新模板在纸上醒来
秋夜灯正明
:::

### Tab 选项卡

每个标签页的内容放进对应的 `tab1`、`tab2`… 命名插槽（MDX 中 Fragment 无需 import）：

::::tabs
:::tab[前端]
前端内容：Astro 静态生成，岛架构按需注水。
:::
:::tab[后端]
后端内容：纯静态输出，评论与动态走外部服务。
:::
::::

::::tabs
:::tab[一]
第一页内容。
:::
:::tab[二]
默认激活第二页。
:::
:::tab[三]
第三页内容。
:::
::::

### Chat 聊天记录

:::chat
{.我}
博客重写用什么模板？
{朋友}
Sonder 收编完成，组件和内容都对齐了。
{:对方撤回了一条消息并投来羡慕的目光}
{.我}
那就这么定了。
:::

### CardList 卡片列表

:::cards

- Astro 静态生成
- Pagefind 中文搜索
- Twikoo 评论
- abcjs 乐谱

:::

## 链接与社群

### LinkCard 链接卡片

::link{href="https://github.com/lmb666666/Sonder" title="Sonder" description="以纸面阅读感为核心的个人发布模板" icon="https://github.com/lmb666666.png?size=64"}

### FriendLinkCard 友链卡片

友链以卡片网格排列；传入 `items`、`src` 或 `source` 都可以。这里复用了站点内置的演示友链数据：

::friend-link-card{src="demo" columns="3"}

### FriendCircle 朋友圈

把友链的 RSS/Atom 动态聚合成时间线，右上角按钮可以重新洗牌。下面使用内置演示数据，不依赖外部订阅源：

::friend-circle{src="demo" limit="3" title="朋友动态"}

### FriendLinkApplication 友链申请

填写名称、主页、简介、头像和 RSS，实时生成友链 JSON；可以复制，也可以直接打开 GitHub Issue 申请。
下面以 Sonder 仓库为例：

::friend-link-application{repository="https://github.com/lmb666666/Sonder" title="申请友链" appearance="bordered"}

## 图像与媒体

### Carousel 轮播

轮播是一组横向滑动的幻灯片，左右按钮切换；每个子项加上 `data-carousel-slide` 即可：

:::carousel{label="封面轮播" aspect="16 / 9"}
![鼠尾草色封面](/images/sample-bg.webp)
![紫藤色封面](/images/site-in-devices.webp)
:::

### LongImage 长图

长图放在固定高度的可滚动视口中，适合截图、长表格或纵向信息图：

:::long-image{height="320px" caption="在视口内滚动查看完整图片；按 Tab 聚焦后也可以使用键盘滚动。"}
![可滚动的长图示例](/images/sample-bg.webp)
:::

### ZoomableImage 图片放大

点击图片打开大图预览，支持关闭按钮和键盘操作。文章里的 Markdown 图片默认也会经过这个组件：

![点击放大的图片示例](/images/site-in-devices.webp)

### MediaShelf 媒体架

书、电影、剧集、专辑和播客共用一套货架。这里用本地封面演示四种类型：

:::media-shelf{columns="4"}
:::media-item{type="book" title="Sonder 手记" creator="示例作者" rating="4" cover-aspect="portrait"}
![Sonder 手记](/images/sample-bg.webp)
:::
:::media-item{type="film" title="夜航" creator="示例导演" rating="5" cover-aspect="portrait"}
![夜航](/images/site-in-devices.webp)
:::
:::media-item{type="album" title="缓慢的下午" creator="示例音乐人" rating="4" cover-aspect="portrait"}
![缓慢的下午](/images/blog-preview.webp)
:::
:::media-item{type="podcast" title="城市观察" creator="示例播客" cover-aspect="portrait"}
![城市观察](/images/logo-with-name.png)
:::
:::

### VideoEmbed 视频嵌入

支持 raw / bilibili / bilibili-nano / youtube / douyin / douyin-wide / tiktok。
以下为 bilibili 示例：

::bilibili{bvid="BV1GJ411x7h7"}

### MusicScore ABC 乐谱

ABC 记谱法乐谱；soundfonts 可达时可试听（音色库不可达时仅显示乐谱）：

:::music-score
X:1
T:小星星
M:4/4
L:1/4
K:C
"1"C C G G|A A G2|"5"F F E E|D D C2|
w: Twink-le twink-le lit-tle star, how I won-der what you are.
:::

### MusicPlayer 播放器

播放器支持原生音频/歌单，也支持 Spotify、SoundCloud、Bandcamp、Apple Music 和网易云的官方
embed。这里用 Spotify embed 演示，不新增本地音频文件：

::music-player{title="示例曲目" provider="spotify" url="https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"}

### NeteasePlaylist 网易云歌单

构建期经 Meting API 解析歌单后交给原生播放器（模板默认携带社区公共实例，
见 `site.toml` 的 `[config.music].meting_api`）：

::netease{type="playlist" id="7294439968"}

Meting 实例不可达或未配置时，同一个组件会自动降级为打开歌单的链接卡片。

## 图表

### Mermaid 图表

文章布局已经全局挂载 `MermaidRenderer`，正文里写 `mermaid` 代码块即可：

```mermaid
flowchart LR
  A[Markdown] --> B[MDX]
  B --> C[静态 HTML]
  C --> D[浏览器]
```

---

## 外挂语法

二十个组件里轻量的那批，现在有了更顺手的**指令写法**：直接写进 Markdown，构建期渲染成 HTML，零 import，`.md` 与 `.mdx` 通吃。

### 提醒块（容器）

`:::note` 家族与上文 Callout 引用块同源，30+ 类型别名通用：

```md
:::note[自定义标题]
支持 foldable 属性折叠。
:::

:::warning
注意写法。
:::
```

:::note[自定义标题]
支持 foldable 属性折叠。
:::

:::warning
注意写法。
:::

### 标签页

```md
::::tabs
:::tab[标题一]
内容一
:::
:::tab[标题二]
内容二
:::
::::
```

::::tabs
:::tab[标题一]
内容一。外层围栏比内层多一道冒号，是标准嵌套规则。
:::
:::tab[标题二]
内容二。
:::
::::

### 折叠面板与图片网格

```md
:::details[点我展开]{open}
默认展开的折叠面板。
:::

:::grid
![图一](cover-14-apricot)
![图二](cover-09-ink)
:::
```

:::details[点我展开]{open}
默认展开的折叠面板。
:::

:::grid
![图一](../../assets/figure/covers/cover-14-apricot.png)
![图二](../../assets/figure/covers/cover-09-ink.png)
:::

### 行内指令

```md
:badge[徽标] :key[Ctrl] :blur[剧透内容] :btn[按钮]{href="https://github.com/lmb666666/Sonder"}
:span[彩色文字]{color="#8a5a32"}
```

:badge[徽标] :key[Ctrl] :blur[剧透内容] :btn[按钮]{href="https://github.com/lmb666666/Sonder"}
:span[彩色文字]{color="#8a5a32"}

### 卡片与嵌入（叶子指令）

```md
::github{repo="CuteLeaf/Firefly"}

::link{href="https://astro.build" title="Astro" description="静态站点框架"}

::bilibili{bvid="BV1GJ411x7h7"}
```

::github{repo="CuteLeaf/Firefly"}

::link{href="https://astro.build" title="Astro" description="静态站点框架"}

完整语法规范见 [Markdown 风格指南](/blog/markdown-style-guide/)。重交互组件（播放器、乐谱、表单等）仍用上方组件写法。

---

外挂指令与 MDX 组件到此看全。指令用法见 [Markdown 风格指南](/blog/markdown-style-guide/)，组件属性说明见源码注释：`src/components/mdx/`。
