# Astro Navfolio

一个基于 Astro 的个人主页仪表盘与博客项目。首页采用紧凑的卡片式布局，用来展示个人资料、常用导航、GitHub 数据、实时时钟、月历、最近关注事项和联系方式。

![首页预览](./homepage.png)

## 功能特性

- 基于 Astro 的静态站点，支持 Markdown 和 MDX 博客内容。
- 响应式个人仪表盘布局，适配桌面端和移动端。
- 使用玻璃拟态卡片组织个人信息、导航、统计、时间和日历。
- 个人资料、导航链接、GitHub 统计和联系方式集中配置在 `src/data/profile.ts`。
- GitHub Stats 使用可配置的 `github-readme-stats` 图片接口。
- 图标统一由 `lucide-astro` 和 `src/components/Icon.astro` 管理，尺寸稳定。
- 当前时间模块支持秒数显示，并让秒数使用更小字号。
- 月历组件会自动标注当天日期。
- 内置 RSS 和 Sitemap 支持。

## 技术栈

- Astro 6
- Bun
- Tailwind CSS 4
- lucide-astro
- @astrojs/mdx
- @astrojs/rss
- @astrojs/sitemap

## 目录结构

```text
public/
  images/                 首页使用的静态图片
src/
  components/
    cards/                首页卡片组件
    layout/               仪表盘网格布局
    widgets/              时钟、日历等小组件
    Icon.astro            统一图标适配组件
  content/blog/           Markdown / MDX 博客文章
  data/profile.ts         首页主要内容与配置
  layouts/                基础布局与博客布局
  pages/                  Astro 页面路由
  styles/global.css       全局样式
astro.config.mjs          Astro 配置
package.json              项目脚本与依赖
homepage.png              首页截图
```

## 本地开发

安装依赖：

```sh
bun install
```

启动开发服务器：

```sh
bun run dev
```

构建生产版本：

```sh
bun run build
```

本地预览生产构建：

```sh
bun run preview
```

## 内容配置

首页大部分内容都在 `src/data/profile.ts` 中维护：

- `profile`：姓名、角色、头像、GitHub、邮箱、网站和所在地。
- `navigationLinks`：主页导航卡片。
- `quote`：引用卡片的文字和图片。
- `intro`：个人介绍卡片内容。
- `githubStats`：GitHub Stats 卡片配置与查询参数。
- `connectLinks`：联系方式和社交链接。
- `doingItems`：最近关注或正在做的事情。

GitHub Stats 的图片地址由 `githubStats.baseUrl` 生成。如果使用公共服务，可以配置为：

```ts
baseUrl: "https://github-readme-stats.vercel.app";
```

如果需要统计私有仓库、降低接口限流风险，建议部署自己的 `github-readme-stats` 实例并配置 GitHub Token。

## 博客内容

博客文章位于 `src/content/blog/`，支持 `.md` 和 `.mdx` 文件。

相关页面：

- `src/pages/blog/index.astro`
- `src/pages/blog/[...slug].astro`

## 部署

这是一个静态 Astro 项目，可以部署到任意支持 Node 或 Bun 构建的静态托管平台。

### GitHub Pages（GitHub Actions）

项目已包含工作流文件：`.github/workflows/deploy-pages.yml`。

触发方式：

- 推送到 `main` 或 `master` 分支时自动部署。
- 支持在 Actions 页面手动触发（`workflow_dispatch`）。

首次启用请在仓库设置中完成：

1. 打开 GitHub 仓库 `Settings -> Pages`。
2. 在 `Build and deployment` 中将 `Source` 设置为 `GitHub Actions`。

该项目会在 GitHub Actions 环境中自动计算 GitHub Pages 的 `site` 和 `base`（支持仓库 Pages 与用户 Pages），避免静态资源路径错误。

推荐构建命令：

```sh
bun run build
```

输出目录：

```text
dist
```
