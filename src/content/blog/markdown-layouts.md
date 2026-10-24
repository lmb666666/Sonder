---
title: 'Markdown 局部布局：分栏与时间线'
description: '使用 @navfolio/plugin-markdown 在文章正文中创建响应式分栏、媒体列和纵向或横向时间线。'
date: '2026-07-24T00:00:00+08:00'
draft: false
showHeroImage: false
tags:
  - Markdown
  - 布局
  - 响应式设计
categories:
  - 插件与扩展
series:
  - 插件与扩展
comments: true
sidebar:
  enable: true
  toc: true
  relatedPosts: true
---

`@navfolio/plugin-markdown` 现在内置局部布局指令。它们只改变文章正文中某一段内容的排列方式，不会影响博客页面、侧栏或主题的整体布局。

目前提供两种布局：通用 `columns` 分栏，以及按时间顺序阅读的 `timeline`。列、时间线事件内继续使用普通 Markdown，因此标题、图片、加粗、链接、引用和列表都照常可用。

布局属性直接写在指令名后，并用空格分隔，例如 `::: columns cols=2 ratio=1:2`。不要使用 `{}` 包裹属性；在 MDX 中，花括号会被当作 JavaScript 表达式交给 Acorn 解析，并可能触发 `Could not parse expression with acorn`。

## 启用

布局能力默认开启；在 `navfolio.config.ts` 中显式声明时，配置如下：

```ts
import { markdownPlugin } from '@navfolio/plugin-markdown';

export default defineNavfolioConfig({
  plugins: [
    markdownPlugin({
      layouts: true,
    }),
  ],
});
```

默认主题已经包含布局样式。使用自定义主题时，导入 `@navfolio/plugin-markdown-layouts/styles.css`，并根据 `.markdown-columns` 和 `.markdown-timeline` 等类名覆盖视觉样式。

## 分栏

一个分栏由 `columns` 容器和若干 `column` 组成。开始、结束与每一列的指令行都要单独占一段。

```md
::: columns cols=2 ratio=1:2

::: column

左侧内容。

:::

::: column

右侧内容。

:::

:::
```

`cols` 可以省略，渲染器会根据 `column` 数量推断。若显式填写，它必须与实际列数一致。`ratio` 用冒号分隔正数来控制宽度比例；不填写时每列等宽。

::: columns cols=2 ratio=1:2

::: column

### 一段引言

分栏适合把一句观点、摘要或短列表从正文的单列节奏中抽出来。

> 内容仍然是普通 Markdown。

:::

::: column

### 一则补充说明

右侧不必与左侧是同一种内容。它可以补充背景、出处、行动项或延伸阅读。

- 比例：`1:1`、`1:2`、`2:1`
- 默认：所有栏等宽
- 窄屏：自动堆叠为一列

:::

:::

## 媒体列

媒体不是另一种布局，而是带有 `media` 标记的一列。显式标记避免把普通截图误判为媒体内容。下例在宽屏时让文字与图片并排，在窄屏时则把图片移到文字前面。

```md
::: columns cols=2 ratio=3:2 mobile=media-first

::: column

文字内容。

:::

::: column media

![图片说明](../../assets/figure/blog-sample-picture.png)

:::

:::
```

::: columns cols=2 ratio=3:2 mobile=media-first

::: column

_FIELD NOTE · 07_

### 在雾里记录颜色

当图片也是叙事的一部分时，把它与一段完整说明放进同一个分栏单元，比单独插在两个段落之间更容易形成阅读节奏。

:::

::: column media

![Navfolio 示例图片](../../assets/figure/blog-sample-picture.png)

:::

:::

`mobile=media-first` 仅在标记了 `media` 的列存在时生效；不设置它时，窄屏堆叠保持 Markdown 的原始顺序。

## 时间线

`timeline` 包含按顺序排列的 `event`。每个事件的 `date` 用作可读的日期标签，事件正文可以包含标题、段落或列表。

```md
::: timeline

::: event date=2024.06

### 收集

整理零散素材。

:::

::: event date=2025.01

### 发布

发布第一个版本。

:::

:::
```

::: timeline

::: event date=2024.06

### 收集

把零散链接、照片和观察整理成可回顾的素材库。

:::

::: event date=2024.10

### 成形

为素材找到一条可以持续展开的叙事主线。

:::

::: event date=2025.01

### 发布

发布第一个公开、可阅读的版本。

:::

:::

### 横向时间线

当节点较少且连续时，可以显式使用横向时间线。事件列不会为适应窄屏而压缩；超出正文宽度时会出现横向滚动条，保留时间顺序与每个节点的可读宽度。

```md
::: timeline direction=horizontal

::: event date=2024.06

### 收集

:::

::: event date=2024.10

### 成形

:::

::: event date=2025.01

### 发布

:::

:::
```

::: timeline direction=horizontal

::: event date=2024.06

### 收集

建立写作素材库。

:::

::: event date=2024.10

### 成形

收敛文章的结构与标题。

:::

::: event date=2025.01

### 发布

发布第一篇完整文章。

:::

::: event date=2026.07

### 扩展

为长文加入局部布局能力。

:::

:::

## 响应式行为

- `columns` 在 `720px` 以下变为单列，并保留每列内的原生 Markdown。
- 使用 `mobile=media-first` 的媒体列在窄屏时优先出现。
- 纵向时间线在所有尺寸保持纵向，日期与事件内容仍然对齐。
- 横向时间线始终横向排列；桌面与手机都可以使用原生横向滚动查看完整节点。

同类布局不能嵌套在 `column` 或 `event` 内。结构不完整、列数不匹配或比例数量不匹配的指令会原样显示，以避免渲染器吞掉作者内容。
