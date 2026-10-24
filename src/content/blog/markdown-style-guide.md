---
title: 'Markdown 语法渲染示例'
description: '这是一篇用于展示 Astro 中常见 Markdown 语法渲染效果的中文示例文章。'
date: '2026-05-19T00:00:00+08:00'
draft: false
heroImage: '/src/assets/figure/blog-sample-picture.png'
showHeroImage: true
tags:
  - 'Markdown'
  - '教程'
categories:
  - 内容创作
series:
  - 内容创作
comments: true
sidebar:
  enable: true
  toc: true
  relatedPosts: true
---

这篇文章用于集中展示常见 Markdown 语法在 Astro 中的渲染效果，便于你写作时快速对照。

## 标题

以下是从一级到六级标题的示例：

# 一级标题 H1

## 二级标题 H2

### 三级标题 H3

#### 四级标题 H4

##### 五级标题 H5

###### 六级标题 H6

## 段落

这是一个普通段落示例。Markdown 的段落通常通过空行分隔。

你可以在段落中使用 **加粗**、_斜体_、`行内代码`，也可以插入 [链接](https://astro.build)。

## 图片

### 语法

```markdown
![图片替代文本](../../assets/figure/blog-sample-picture.png)
```

正文中的本地图片路径相对于当前 Markdown 文件书写。`src/docs/blog/` 下的文章
使用 `../../assets/figure/` 引用 `src/assets/figure/`；不要写成
`/src/assets/...`，否则它会被当作普通站点 URL，而 `src` 目录不会发布到构建产物。

### 渲染效果

![blog placeholder](../../assets/figure/blog-sample-picture.png)

## 引用

### 无署名引用

#### 语法

```markdown
> 这是一个引用块示例。
> **提示：** 引用里同样可以使用 _Markdown_ 语法。
```

#### 渲染效果

> 这是一个引用块示例。
> **提示：** 引用里同样可以使用 _Markdown_ 语法。

### 带署名引用

#### 语法

```markdown
> 不要通过共享内存来通信，而要通过通信来共享内存。<br>
> — <cite>Rob Pike[^1]</cite>
```

#### 渲染效果

> 不要通过共享内存来通信，而要通过通信来共享内存。<br>
> — <cite>Rob Pike[^1]</cite>

[^1]: 引文改写自 Rob Pike 在 Gopherfest 的演讲。

## 表格

### 语法

```markdown
| 样式 | 示例     |
| ---- | -------- |
| 斜体 | _文字_   |
| 加粗 | **文字** |
| 代码 | `code`   |
```

### 渲染效果

| 样式 | 示例     |
| ---- | -------- |
| 斜体 | _文字_   |
| 加粗 | **文字** |
| 代码 | `code`   |

## 代码块

### 语法

在三反引号后面指定语言类型，可以启用语法高亮，例如 `html`、`css`、`js`、`ts`、`bash`。

````markdown
```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>示例页面</title>
  </head>
  <body>
    <p>Hello Markdown</p>
  </body>
</html>
```
````

### 渲染效果

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>示例页面</title>
  </head>
  <body>
    <p>Hello Markdown</p>
  </body>
</html>
```

## 列表

### 有序列表

#### 语法

```markdown
1. 第一项
2. 第二项
3. 第三项
```

#### 渲染效果

1. 第一项
2. 第二项
3. 第三项

### 无序列表

#### 语法

```markdown
- 列表项 A
- 列表项 B
- 列表项 C
```

#### 渲染效果

- 列表项 A
- 列表项 B
- 列表项 C

### 嵌套列表示例

#### 语法

```markdown
- 水果
  - 苹果
  - 橙子
  - 香蕉
- 乳制品
  - 牛奶
  - 奶酪
```

#### 渲染效果

- 水果
  - 苹果
  - 橙子
  - 香蕉
- 乳制品
  - 牛奶
  - 奶酪

## 数学公式

### 语法

```markdown
行内公式示例：当 $a \ne 0$ 时，二次方程 $ax^2 + bx + c = 0$ 的解为 $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$。

行间公式示例：

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$
```

### 渲染效果

行内公式示例：当 $a \ne 0$ 时，二次方程 $ax^2 + bx + c = 0$ 的解为 $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$。

行间公式示例：

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$

## 其他常见内联元素

### 语法

```markdown
<abbr title="Graphics Interchange Format">GIF</abbr> 是一种位图格式。

H<sub>2</sub>O

X<sup>n</sup> + Y<sup>n</sup> = Z<sup>n</sup>

按下 <kbd>CTRL</kbd> + <kbd>ALT</kbd> + <kbd>Delete</kbd>。

<mark>高亮文本</mark>
```

### 渲染效果

<abbr title="Graphics Interchange Format">GIF</abbr> 是一种位图格式。

H<sub>2</sub>O

X<sup>n</sup> + Y<sup>n</sup> = Z<sup>n</sup>

按下 <kbd>CTRL</kbd> + <kbd>ALT</kbd> + <kbd>Delete</kbd>。

<mark>高亮文本</mark>
