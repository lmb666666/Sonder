---
title: '文章组件速览'
description: 'Sonder 全部外挂标签的语法与真实渲染效果：徽标、按键、剧透、提醒块、标签页、分栏、时间线、折叠、诗歌、聊天、卡片、轮播、长图、媒体架、链接卡、GitHub 卡、视频、音乐、乐谱与友链。'
date: '2026-10-25T00:00:00+08:00'
draft: false
heroImage: '/src/assets/figure/covers/cover-09-ink.png'
showHeroImage: false
tags:
  - 组件
  - 外挂标签
categories:
  - 功能
comments: true
sidebar:
  enable: true
  toc: true
---

Sonder 提供一套**外挂标签**语法：写作时直接写指令，构建期渲染成组件，零 import，`.md` 与 `.mdx` 通用。标准 Markdown 语法见 [Markdown 语法](/blog/markdown-style-guide/)，本文只讲模板扩展的组件能力。

## 语法速查

外挂标签有三种形式，均为 `名称 + [标题] + {属性}` 的组合：

- **容器** `:::name[标题]{属性}` … `:::`：包裹一段内容（提醒块、标签页、诗歌……）
- **叶子** `::name{属性}`：自闭合块（链接卡、视频、播放器……）
- **行内** `:name[文字]{属性}`：混排行内文字（徽标、按键、剧透……）

| 容器指令 | 说明 |
| --- | --- |
| `note` / `tip` / `warning` / `danger` … | 提醒块，30+ 类型别名，`{foldable}` 折叠、`{open}` 默认展开 |
| `details` | 折叠面板，需要 `[标题]`，`{open}` 默认展开 |
| `grid` | 图片网格 |
| `tabs` + `tab` | 标签页；外层围栏比内层多一道冒号 |
| `columns` + `column` | 分栏；`{cols="2" ratio="1:2"}` |
| `timeline` + `event` | 时间线；`{direction="horizontal"}`，`:::event[日期]` |
| `poetry` | 诗歌排版；`[标题\|作者]`，`{footer="…"}` |
| `chat` | 聊天记录；`{名字}` / `{.我}` / `{:系统}` |
| `cards` | 卡片列表，包裹 Markdown 列表 |
| `carousel` | 轮播；`{aspect="16 / 9"}` |
| `long-image` | 长图滚动视口；`{height="320px" caption="…"}` |
| `media-shelf` + `media-item` | 媒体架；`{columns="4"}`，子项 `{type="book" title="…" creator="…" rating="4"}` |
| `music-score` | ABC 记谱法乐谱 |

| 叶子指令 | 说明 |
| --- | --- |
| `link` | 链接卡片；`{href="…" title="…" description="…" icon="…"}` |
| `github` | GitHub 仓库卡片；`{repo="owner/repo"}`，stars 构建期预取 |
| `bilibili` | B 站视频；`{bvid="BV…"}` |
| `youtube` | YouTube 视频；`{id="…"}` |
| `netease` | 网易云音乐；`{id="歌单ID"}` 走原生播放器，`{type="song\|album\|radio" id="…"}` 走官方外链 |
| `music-player` | 官方播放器；`{provider="spotify\|soundcloud\|youtube\|…" url="…"}` |
| `friend-link-card` | 友链卡片网格；`{src="数据源" columns="3"}` |
| `friend-circle` | 朋友圈动态；`{src="数据源" limit="10" title="…"}` |
| `friend-link-application` | 友链申请表单；`{repository="owner/repo"}` |

| 行内指令 | 说明 |
| --- | --- |
| `badge` | 行内徽标；`{href="…"}` 可点击，`{img="…"}` 带图标 |
| `key` | 键帽；支持 `{ctrl}` `{shift}` `{cmd}` 等修饰键，真实按键时点亮 |
| `blur` | 剧透模糊，悬停或聚焦显形 |
| `span` | 行内样式；`{color="#…"}` |
| `btn` | 行内按钮；`{href="…"}` |

规则：**嵌套**时外层围栏冒号数必须多于内层（`::::tabs` 包 `:::tab`）；`{a=b}` 与 `{a="b"}` 等价，`#id`、`.class` 简写可用；未知指令展开为普通内容并在构建时警告；演示语法本身时放进代码围栏即可。

---

## 行内组件

### Badge 徽标

带图标与链接的行内徽标；不传 `img` 时会自动取 GitHub 头像或站点 favicon。

```md
:badge[Astro]{href="https://astro.build"}
:badge[纯文字徽标]
:badge[带图圆形]{img="https://github.com/lmb666666.png?size=64" href="https://github.com/lmb666666"}
```

:badge[Astro]{href="https://astro.build"}
:badge[GitHub]{href="https://github.com/lmb666666/Sonder"}
:badge[纯文字徽标]
:badge[带图圆形]{img="https://github.com/lmb666666.png?size=64" href="https://github.com/lmb666666"}

### Key 按键

快捷键键帽；macOS 上自动切换符号，页面上真实按下对应组合键时按键会点亮。

```md
复制 :key[Ctrl] + :key[C]
搜索 :key[Cmd] + :key[K]{cmd}
```

复制 :key[Ctrl] + :key[C]；搜索 :key[Cmd] + :key[K]{cmd}；全选 :key[Ctrl] + :key[Shift] + :key[A]

### Blur 剧透模糊

```md
剧透警告：:blur[他是凶手]
```

默认模糊，悬停、聚焦或按住时显形——剧透警告：:blur[他是凶手]。

### Span 彩色文字

```md
:span[一抹赭石色]{color="#8a5a32"}
```

把重点写成 :span[一抹赭石色]{color="#8a5a32"}，或 :span[主题色强调]{color="var(--paper-accent)"}。

### Btn 按钮

```md
:btn[查看仓库]{href="https://github.com/lmb666666/Sonder"}
```

:btn[查看仓库]{href="https://github.com/lmb666666/Sonder"}

## 提醒块与结构

### Callout 提醒块

`:::note` 家族与标准引用块写法相近，30+ 类型别名通用；`{foldable}` 可折叠。

```md
:::note[自定义标题]
支持 foldable 属性折叠。
:::

:::warning
注意写法。
:::
```

:::note[自定义标题]
在围栏后加 `{foldable}` 即可折叠。
:::

:::tip
小贴士一类的内容。
:::

:::warning
注意写法。
:::

### Details 折叠面板

```md
:::details[点我展开]{open}
默认展开的折叠面板。
:::
```

:::details[点我展开]{open}
默认展开的折叠面板。
:::

### Grid 图片网格

```md
:::grid
![图一](../../assets/figure/covers/cover-14-apricot.png)
![图二](../../assets/figure/covers/cover-01-sage.png)
:::
```

:::grid
![图一](../../assets/figure/covers/cover-14-apricot.png)
![图二](../../assets/figure/covers/cover-01-sage.png)
:::

### Tabs 标签页

```md
::::tabs
:::tab[前端]
前端内容。
:::
:::tab[后端]
后端内容。
:::
::::
```

::::tabs
:::tab[前端]
前端内容：Astro 静态生成，岛架构按需注水。
:::
:::tab[后端]
后端内容：纯静态输出，评论与动态走外部服务。
:::
:::tab[写作]
写作内容：Markdown 里写指令即可。
:::
::::

### Columns 分栏

```md
::::columns{cols="2"}
:::column
左栏内容。
:::
:::column
右栏内容。
:::
::::
```

::::columns{cols="2"}
:::column
左栏内容：适合图文并排、对照说明。
:::
:::column
右栏内容：分栏在窄屏自动折叠为单列。
:::
::::

### Timeline 时间线

```md
::::timeline
:::event[2026-10-25]
发布外挂标签体系。
:::
:::event[2026-10-31]
全组件指令化。
:::
::::
```

::::timeline
:::event[2026-10-25]
统一指令语法落地。
:::
:::event[2026-10-31]
全部组件指令化，文章回归纯 Markdown。
:::
::::

## 排版组件

### Poetry 诗歌排版

标签写 `[标题|作者]`，脚注用 `{footer}`。

```md
:::poetry[俳句一则|示例]{footer="—— 匿名"}
旧博客沉去
新模板在纸上醒来
秋夜灯正明
:::
```

:::poetry[俳句一则|示例]{footer="—— 匿名"}
旧博客沉去
新模板在纸上醒来
秋夜灯正明
:::

### Chat 聊天记录

`{名字}` 为对方消息、`{.我}` 为我方消息（靠右、主题色）、`{:文字}` 为系统消息（居中小字）；署名行与消息行之间建议空行。

```md
:::chat
{.我}

博客重写用什么模板？

{朋友}

Sonder 收编完成，组件和内容都对齐了。

{:对方撤回了一条消息并投来羡慕的目光}
:::
```

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

把 Markdown 列表渲染为响应式卡片网格。

```md
:::cards
- Astro 静态生成
- Pagefind 中文搜索
:::
```

:::cards

- Astro 静态生成
- Pagefind 中文搜索
- Twikoo 评论
- abcjs 乐谱

:::

## 图像与媒体

### Carousel 轮播

容器里的每个顶层元素是一张幻灯片，左右按钮切换；`{aspect}` 控制画幅。

```md
:::carousel{label="封面轮播" aspect="16 / 9"}
![鼠尾草色封面](../../assets/figure/covers/cover-01-sage.png)
![紫藤色封面](../../assets/figure/covers/cover-04-lavender.png)
:::
```

:::carousel{label="封面轮播" aspect="16 / 9"}
![鼠尾草色封面](../../assets/figure/covers/cover-01-sage.png)
![紫藤色封面](../../assets/figure/covers/cover-04-lavender.png)
![墨色封面](../../assets/figure/covers/cover-09-ink.png)
:::

### LongImage 长图

长图放在固定高度的可滚动视口中，适合截图、长表格或纵向信息图。

```md
:::long-image{height="240px" caption="在视口内滚动查看完整图片。"}
![可滚动的长图示例](../../assets/figure/covers/cover-13-steel.png)
:::
```

:::long-image{height="240px" caption="在视口内滚动查看完整图片；按 Tab 聚焦后也可以使用键盘滚动。"}
![可滚动的长图示例](../../assets/figure/covers/cover-13-steel.png)
:::

### 图片放大（全局行为）

文章里的 Markdown 图片默认支持点击放大，无需任何指令：

![点击放大的图片示例](../../assets/figure/covers/cover-07-teal.png)

### MediaShelf 媒体架

书、电影、剧集、专辑和播客共用一套货架；封面跟随图片处理管线。

```md
::::media-shelf{columns="4"}
:::media-item{type="book" title="Sonder 手记" creator="示例作者" rating="4" cover-aspect="portrait"}
![Sonder 手记](../../assets/figure/covers/cover-08-cocoa.png)
:::
::::
```

::::media-shelf{columns="4"}
:::media-item{type="book" title="Sonder 手记" creator="示例作者" rating="4" cover-aspect="portrait"}
![Sonder 手记](../../assets/figure/covers/cover-08-cocoa.png)
:::
:::media-item{type="film" title="夜航" creator="示例导演" rating="5" cover-aspect="portrait"}
![夜航](../../assets/figure/covers/cover-13-steel.png)
:::
:::media-item{type="album" title="缓慢的下午" creator="示例音乐人" rating="4" cover-aspect="portrait"}
![缓慢的下午](../../assets/figure/covers/cover-04-lavender.png)
:::
:::media-item{type="podcast" title="城市观察" creator="示例播客" cover-aspect="portrait"}
![城市观察](../../assets/figure/covers/cover-11-sand.png)
:::
::::

### Mermaid 图表

文章布局已全局挂载 Mermaid 渲染器，正文里直接写 `mermaid` 代码块即可：

````md
```mermaid
flowchart LR
  A[Markdown] --> B[指令]
  B --> C[静态 HTML]
  C --> D[浏览器]
```
````

```mermaid
flowchart LR
  A[Markdown] --> B[指令]
  B --> C[静态 HTML]
  C --> D[浏览器]
```

## 链接与社群

### Link 链接卡片

```md
::link{href="https://github.com/lmb666666/Sonder" title="Sonder" description="以纸面阅读感为核心的个人发布模板" icon="https://github.com/lmb666666.png?size=64"}
```

::link{href="https://github.com/lmb666666/Sonder" title="Sonder" description="以纸面阅读感为核心的个人发布模板" icon="https://github.com/lmb666666.png?size=64"}

### GitHub 仓库卡片

仓库描述与 stars 在构建期预取（脚本 `bun run github-cards`），离线时降级为普通链接卡。

```md
::github{repo="CuteLeaf/Firefly"}
```

::github{repo="CuteLeaf/Firefly"}

### Bilibili / YouTube 视频

```md
::bilibili{bvid="BV1GJ411x7h7"}
::youtube{id="dQw4w9WgXcQ"}
```

::bilibili{bvid="BV1GJ411x7h7"}

### FriendLinkCard 友链卡片

友链以卡片网格排列；`src` 指向 `src/data/` 里配置的数据源。

```md
::friend-link-card{src="demo" columns="3"}
```

::friend-link-card{src="demo" columns="3"}

### FriendCircle 朋友圈

把友链的 RSS/Atom 动态聚合成时间线，右上角按钮可以重新洗牌；下面使用内置演示数据，不依赖外部订阅源。

```md
::friend-circle{src="demo" limit="3" title="朋友动态"}
```

::friend-circle{src="demo" limit="3" title="朋友动态"}

### FriendLinkApplication 友链申请

填写名称、主页、简介、头像和 RSS，实时生成友链 JSON；可以复制，也可以直接打开 GitHub Issue 申请。

```md
::friend-link-application{repository="https://github.com/lmb666666/Sonder"}
```

::friend-link-application{repository="https://github.com/lmb666666/Sonder" title="申请友链" appearance="bordered"}

## 音乐与乐谱

### MusicPlayer 官方播放器

支持 Spotify、SoundCloud、YouTube、Apple Music、Bandcamp 等平台的官方 embed：

```md
::music-player{title="示例曲目" provider="spotify" url="https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"}
```

::music-player{title="示例曲目" provider="spotify" url="https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT"}

### NeteasePlaylist 网易云歌单

歌单在构建期经 Meting API 解析为曲目清单，交给模板自带的原生播放器（实例地址见 `site.toml` 的 `[config.music].meting_api`）；解析失败时自动降级为链接卡片。

```md
::netease{id="7294439968"}
```

::netease{id="7294439968"}

单曲、专辑与电台走官方外链播放器：

```md
::netease{type="song" id="28560087"}
```

::netease{type="song" id="28560087"}

### MusicScore ABC 乐谱

ABC 记谱法乐谱；soundfonts 音源可达时可试听（不可达时仅显示乐谱）。

````md
:::music-score
X:1
T:小星星
M:4/4
L:1/4
K:C
"1"C C G G|A A G2|"5"F F E E|D D C2|
w: Twink-le twink-le lit-tle star, how I won-der what you are.
:::
````

:::music-score
X:1
T:小星星
M:4/4
L:1/4
K:C
"1"C C G G|A A G2|"5"F F E E|D D C2|
w: Twink-le twink-le lit-tle star, how I won-der what you are.
:::

---

以上就是全部外挂标签。写法上记住一件事即可：内容用容器、自包含块用叶子、文字里的点缀用行内——其余交给构建期。
