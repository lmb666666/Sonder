---
title: '使用 Callout 插件渲染 Obsidian 风格提示框'
description: '了解 @navfolio/plugin-markdown 如何在 Navfolio 中解析 Obsidian Callout 语法，并渲染全部内置 Callout 类型。'
date: '2026-07-12T03:00:00+08:00'
draft: false
showHeroImage: false
tags:
  - Markdown
  - Callout
  - Obsidian
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

Navfolio 通过 `@navfolio/plugin-markdown` 内置 Obsidian 风格 Callout 能力。它会把 Markdown 引用块中的 `[!type]` 标记解析成更适合阅读的提示框，用来承载说明、提醒、警告、FAQ、引用和示例。

这个插件适合从 Obsidian 迁移内容的写作者：原本写在笔记里的 Callout 语法可以直接放进 Navfolio 的文章和文档里，不需要改成额外的 Astro 组件。

这篇文章同时覆盖普通、折叠、展开和嵌套 Callout，可作为本地构建时的渲染检查页面。

## 安装与启用

在 Navfolio 项目中安装或更新 Markdown 插件：

```sh
bun add @navfolio/plugin-markdown@github:navfolio/plugin-markdown
```

然后在 `navfolio.config.ts` 中启用 `markdownPlugin()`。Callout 默认开启，如果需要显式声明，可以保留 `callouts: true`：

```ts
import { markdownPlugin } from '@navfolio/plugin-markdown';

import { defineNavfolioConfig } from './src/plugins/config';

export default defineNavfolioConfig({
  plugins: [
    markdownPlugin({
      callouts: true,
      expressiveCode: true,
      math: {
        enabled: true,
      },
      mermaid: true,
      responsiveTables: true,
    }),
  ],
});
```

Callout 样式会由 `@navfolio/plugin-markdown` 自动注入，不需要在 `global.css` 中额外引入 `@navfolio/plugin-callout` 或 Markdown 插件的样式文件。

`@navfolio/plugin-callout` 是底层实现包，适合插件维护和其他项目复用；在 Navfolio 项目里，通常只需要通过 `@navfolio/plugin-markdown` 间接使用它。若要关闭 Callout 渲染，可以在 `markdownPlugin()` 中设置 `callouts: false`。

## 基础语法

Callout 使用标准的 Obsidian 写法：

```md
> [!tip] 写作提示
> 把重要信息放进 Callout，可以让读者更快抓住上下文。
```

渲染效果如下：

> [!tip] 写作提示
> 把重要信息放进 Callout，可以让读者更快抓住上下文。

如果不写标题，插件会使用类型的默认标题：

```md
> [!note]
> 这是一条默认标题的 note。
```

> [!note]
> 这是一条默认标题的 note。

## 支持的全部类型

插件内置了 13 种 Obsidian 常见主类型：`note`、`abstract`、`info`、`todo`、`tip`、`success`、`question`、`warning`、`failure`、`danger`、`bug`、`example`、`quote`。

> [!note] Note
> `note` 适合承载普通说明、补充解释和不需要特殊语气的提示。

> [!abstract] Abstract
> `abstract` 适合摘要、总览、TL;DR 和章节开头的快速结论。

> [!info] 信息
> `info` 适合补充背景、版本说明和非阻断性的上下文。

> [!todo] Todo
> `todo` 适合记录待办事项、下一步动作和检查清单里的单项任务。

> [!tip] Tip
> `tip` 适合给出技巧、建议、捷径和更高效的实践方式。

> [!success] Success
> `success` 适合展示完成状态、通过检查的结果和正向反馈。

> [!question] Question
> `question` 适合 FAQ、常见疑问、决策前需要确认的问题。

> [!warning] 注意
> `warning` 适合提醒读者某个操作可能带来风险。

> [!failure] Failure
> `failure` 适合说明失败原因、缺失条件和未通过的检查项。

> [!danger] 危险操作
> `danger` 适合放置会破坏数据、影响部署或需要额外确认的步骤。

> [!bug] Bug
> `bug` 适合记录缺陷、异常行为、复现线索和临时规避方案。

> [!example] Example
> `example` 适合展示案例、输入输出样例和配置片段的说明。

> [!quote] 引用
> `quote` 适合保留一句原文、观点或设计原则。

## 可折叠 Callout

在类型标记后加 `-`，会生成默认折叠的 `<details>`：

```md
> [!faq]- 为什么选择独立插件？
> 因为 Callout 属于 Markdown 渲染能力，单独维护可以复用到文档站、博客和后续 Navfolio 插件生态。
```

> [!faq]- 为什么选择独立插件？
> 因为 Callout 属于 Markdown 渲染能力，单独维护可以复用到文档站、博客和后续 Navfolio 插件生态。

在类型标记后加 `+`，会生成默认展开的 `<details>`：

```md
> [!example]+ 默认展开示例
> 这个区块会在页面加载时保持展开状态。
```

> [!example]+ 默认展开示例
> 这个区块会在页面加载时保持展开状态。

## 嵌套写法

Callout 本质上仍然来自 Markdown blockquote，所以可以继续嵌套：

```md
> [!question] 外层问题
> 这里是问题背景。
>
> > [!tip] 内层提示
> > 嵌套 Callout 可以用于补充说明。
```

> [!question] 外层问题
> 这里是问题背景。
>
> > [!tip] 内层提示
> > 嵌套 Callout 可以用于补充说明。

## 适合放在哪里

Callout 适合用于：

1. 操作步骤中的注意事项。
2. 文档里的 FAQ 和背景补充。
3. 迁移自 Obsidian 的知识库内容。
4. 博客文章中的重点、警告、引用和示例。

它不适合替代正文结构。如果一段内容本身应该成为章节，优先使用标题；如果它只是帮助读者理解正文的辅助信息，再使用 Callout。
