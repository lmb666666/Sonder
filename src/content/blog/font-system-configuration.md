---
title: 'Navfolio 字体系统配置'
description: '了解 Navfolio 如何配置本地字体、WebFont、UI 字体子集和站点级字体选择。'
date: '2026-07-04T07:19:41.131Z'
draft: false
sticky: false
showHeroImage: false
tags:
  - Astro
  - Fonts
  - Typography
categories:
  - 主站配置
series:
  - 主站配置
comments: true
sidebar:
  enable: true
  toc: true
  relatedPosts: true
---

> 小记：之前默认用的是 [LXGW WenKai](https://github.com/lxgw/LxgwWenKai)。它的阅读体验很舒服，尤其适合长文，但在加粗、倾斜和一些 UI 状态里的适配不算稳定。所以这次默认中文字体改成了寒蝉半圆体 [ChillRound](https://github.com/Warren2060/ChillRound)，整体会更圆润，也更适合和 UI 字重一起工作。

Navfolio 的字体系统分成两层：字体文件在哪里加载，以及页面应该优先使用哪个字体族。

字体文件由 CSS 和本地字体资源负责。站点级选择由 `src/config/site.toml` 负责。这样做的好处是，作者可以先把字体加载方式整理清楚，再用配置决定 UI、代码感文本和中文阅读文本分别使用什么字体。

## Font Files

本地字体文件放在：

```txt
public/fonts/
```

例如默认中文完整字体放在：

```txt
public/fonts/ChillRoundM.ttf
```

静态资源进入 `public/` 后，可以直接通过根路径访问：

```css
src: url('/fonts/ChillRoundM.ttf') format('truetype');
```

如果你更喜欢使用 CDN 或第三方 webfont，可以在 `src/styles/fonts.css` 中添加 `@import`，或者在共享 head 组件中添加 `<link rel="stylesheet">`。需要注意的是，UI 子集生成必须使用本地字体文件，远程 CDN 字体不参与 `bun run fonts:ui`。

## fonts.css

全局字体声明集中在：

```txt
src/styles/fonts.css
```

这里负责两件事：

1. 导入 package 或 CDN 提供的 webfont。
2. 为默认本地字体文件声明 `@font-face`。

默认配置会导入 Maple Mono，并声明 ChillRoundM 的 UI 子集和完整字体：

```css
@import '@fontsource/maple-mono/400.css';

@font-face {
  font-family: 'ChillRoundM';
  src: url('/fonts/ChillRoundM.ttf') format('truetype');
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
```

`font-family` 是页面使用的字体族名称。`src` 才是字体文件或远程资源的位置。

## Site Config

站点级字体选择写在：

```toml
[config.fonts]
en = "Maple Mono"
code = "Maple Mono"
zh = "ChillRoundM"
file = "/fonts/ChillRoundM.ttf"
```

这些字段保持短而直接：

- `en`：英文、代码感 UI、元信息和按钮标签的字体族。
- `code`：代码块、行内代码和 `--font-code` 使用的字体族；未配置时会回退到 `en` 的默认字体。
- `zh`：中文阅读文本的字体族。
- `file`：完整中文字体的本地文件路径，也用于子集生成。

UI 子集路径不需要手动配置，会自动从 `file` 推导。例如 `/fonts/ChillRoundM.ttf` 会生成 `/fonts/ChillRoundM-ui-subset.woff2`。

如果这个配置块不存在，或者某个值留空，Navfolio 会使用默认值：

```txt
en: Maple Mono
code: Maple Mono
zh: ChillRoundM
file: /fonts/ChillRoundM.ttf
```

## UI Subset

中文完整字体通常比较大。Navfolio 默认把第一屏 UI 和列表页使用到的中文字符生成一个轻量子集：

```bash
bun run fonts:ui
```

这个命令会读取源码、配置和部分内容中的 CJK 字符，生成：

```txt
scripts/fonts/ui-chars.txt
public/fonts/ChillRoundM-ui-subset.woff2
```

生成逻辑位于：

```txt
scripts/fonts/subset-ui-font.ts
```

静态 UI 文案也在子集扫描范围内。内置多语言文案集中放在 `src/i18n/*.json`，页面模块则通过 `@navfolio/core` 提供自己的 catalog；`bun run fonts:ui` 会把两者里的中文字符纳入 `scripts/fonts/ui-chars.txt`，避免切换到简体中文 UI 时额外触发完整中文字体文件。

当部署工作流启用 friend circle 同步后，Action 会先生成 `public/friend-circle.json`。子集脚本会读取其中每篇文章的 `title`、`author` 和 `tags`，将这些 RSS 列表实际展示的中日韩字符一并纳入 UI 子集。文件不存在、功能未启用或 JSON 格式异常时，普通构建不会因此失败。

子集脚本会读取 `src/config/site.toml`：

- 使用 `config.fonts.file` 作为源字体文件。
- 自动把源文件名加上 `-ui-subset.woff2` 作为输出文件。
- 使用 `config.fonts.zh` 同步页面中的子集字体族名称，例如 `ChillRoundM UI Subset`。

构建时会自动先运行子集生成：

```bash
bun run build
```

所以只要默认字体文件存在，发布前不需要手动再跑一次子集命令。

## Full Font Warmup

文章正文仍然需要完整中文字体。为了不把完整字体放进第一屏关键路径，Navfolio 使用：

```txt
src/components/FullFontWarmup.astro
```

它会等页面加载稳定之后，用 `prefetch` 预热 `config.fonts.file` 指向的完整字体。

如果你改了完整中文字体的文件路径，只需要同步检查：

```txt
src/config/site.toml
src/styles/fonts.css
```

`site.toml` 决定页面使用哪一个字体文件，`fonts.css` 可以继续保存默认声明和额外的自定义字体声明。

## Changing Fonts

更换字体时按这个顺序做：

1. 把本地字体文件放进 `public/fonts/`，或者确认 CDN 字体可以访问。
2. 在 `src/styles/fonts.css` 中添加对应的 `@font-face` 或导入语句。
3. 在 `src/config/site.toml` 的 `[config.fonts]` 里写入字体族名称和本地字体路径。
4. 运行 `bun run format:check` 和 `bun run build`。

例如：

```toml
[config.fonts]
en = "Maple Mono"
code = "Maple Mono"
zh = "Noto Serif SC"
file = "/fonts/NotoSerifSC-Regular.otf"
```

然后在 `fonts.css` 中确保有同名字体：

```css
@font-face {
  font-family: 'Noto Serif SC';
  src: url('/fonts/NotoSerifSC-Regular.otf') format('opentype');
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
```

配置文件负责选择字体族和本地源文件。字体格式、额外权重和 CDN 加载策略仍然留在 CSS 里。
