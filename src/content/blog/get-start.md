---
title: Astro Navfolio 快速上手部署指南
description: 使用navfolio主题的第 0 篇必读使用手册，快速get start
date: 2026-07-05T08:13:22.188Z
draft: false
sticky: true
showHeroImage: false
tags: []
categories:
  - 入门
series:
  - 新手入门
comments: true
sidebar:
  enable: true
  toc: true
  relatedPosts: true
---

> Astro Navfolio 是一个功能相当完整、设计用心的个人站点模板，特别适合希望拥有一个集写作、作品展示和个性化导航于一体的静态网站的开发者。
> 主题仓库：[Astro-Navfolio](https://github.com/dodolalorc/astro-navfolio)，主题文档仓库：[Astro-Navfolio-Docs](https://github.com/navfolio/astro-navfolio-docs)
> 个人站点效果可以参考我的博客：[dodola's blog](https://dodolalorc.cn/)

本指南将带你从零开始，在本地运行并部署你的个人 Navfolio 站点。

## 1. 环境准备

在开始之前，请确保你的电脑上已安装以下工具：

- **Node.js**：推荐使用最新的 LTS（长期支持）版本。
- **Bun**：本项目使用 Bun 作为包管理器和运行工具。如果你尚未安装，可以通过以下命令快速安装：

```bash
curl -fsSL https://bun.sh/install | bash
```

安装完成后，重启终端并运行 `bun --version` 来验证是否安装成功。

- **Git**：用于克隆仓库。
- **Python 3**、`fonttools` 和 `brotli`：生产构建的硬依赖，用于生成中日韩 UI 字体子集。`bun run build` 会自动运行该步骤；如果缺少这些工具，构建会失败。

建议把 Python 工具安装在项目根目录的虚拟环境中。无需手动激活虚拟环境，Navfolio 会自动优先使用 `.venv`：

macOS / Linux：

```bash
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip fonttools brotli
```

Windows（PowerShell 或命令提示符）：

```powershell
py -3 -m venv .venv
.venv\Scripts\python.exe -m pip install --upgrade pip fonttools brotli
```

## 2. 获取项目与安装依赖

1.  **克隆仓库**：
    打开终端，进入你存放代码的目录，然后运行：

```bash
git clone https://github.com/dodolalorc/astro-navfolio.git
cd astro-navfolio
```

2.  **安装依赖**：
    使用 Bun 安装项目所需的所有依赖包：

```bash
bun install
```

3. **验证字体子集化环境**：

```bash
bun run fonts:ui
```

该命令会生成 `public/fonts/*-ui-subset.woff2`。之后新增或修改会显示在 UI、标题或轻量内容中的中日韩文字时，正常执行 `bun run build` 即会自动更新这个文件。

## 3. 本地开发与预览

- **启动开发服务器**：
  运行以下命令，即可在本地启动一个带热重载功能的开发服务器：

```bash
bun run dev
```

终端会显示本地访问地址（默认是 `http://localhost:4321`），在浏览器中打开即可预览站点。

- **构建与预览生产版本**：
  如需测试最终构建效果，可以先构建再预览：

```bash
bun run build      # 构建静态文件到 dist 目录
bun run preview    # 在本地启动一个服务来预览构建后的站点
```

**注意**

- `bun run build` 会先生成 UI 和轻量内容中的中日韩字体子集，再构建站点；因此本机和 CI 都必须配置 Python 3、FontTools 与 Brotli。
- 如果在开发环境中发现字体使用异常，可以先运行 `bun run build`，再运行 `bun run dev`。
- `bun run dev`默认会以`src/content/`为文章的数据源

## 4. 个性化你的站点

这是最关键的步骤。你无需修改复杂的组件代码，大部分内容通过配置文件或 Markdown 文件即可完成。

1.  **修改核心配置** (`src/config/site.toml`)：

    - `[config.site]`：站点的标题、描述、仓库地址等。
    - `[config.profile]`：你的姓名、头像、身份、社交媒体链接（GitHub、邮箱等）。
    - `[[config.topNav.links]]`：修改顶部导航栏的菜单项。
    - `[config.theme]`：更改 `palette` 字段的值来切换内置主题色盘。

2.  **替换页面内容**：

    - **“关于”页面**：直接编辑 `src/content/about.mdx` 文件来重写你的个人介绍。
    - **首页介绍**：在 `src/config/site.toml` 文件中找到 `[config.home]` 部分，修改 `greeting` 和 `introduction` 等字段。

3.  **管理内容（博客/项目/Vibe）**：

    - **创建新内容**：项目提供了便捷的脚本命令。
      - 新建博客：`bun run post:new my-first-post`
      - 新建项目：`bun run project:new my-project`
      - 新建 Vibe 短记录：`bun run vibe:new today-mood`
      - 新建书影音记录：`bun run media:new my-favourite-book`
      - 命令统一为 `bun run <页面简称>:new <文件名> [可选输出目录]`；文件名也会成为初始 `title`。
      - （生成的 `.md` 或 `.mdx` 文件默认会出现在对应的 `src/content/` 子目录下）
    - **删除或修改示例内容**：你可以直接编辑或删除 `src/content/blog/`、`src/content/projects/` 和 `src/content/vibe/` 目录下的示例文件。

4.  **替换静态资源**：
    将你的 **站点 Logo**、**头像** 等图片替换 `public/images/` 目录下的对应文件。

## 5. 部署上线

Navfolio 构建后是纯静态文件，你可以轻松部署`dist`到任何支持静态站点的平台。

- **通用部署步骤**：

  1.  在项目根目录下运行 `bun run build` 命令，生成 `dist` 文件夹。
  2.  将 `dist` 文件夹内的所有内容上传到你选择的托管服务（如 GitHub Pages、Vercel、Netlify 或 Cloudflare Pages）即可。

- **特别提示（GitHub Pages）**：
  如果你使用 GitHub Pages 的项目页（Project Site），且仓库名为 `<你的用户名>.github.io` 以外的名字，则可能需要设置 `base` 路径。
  - 项目内置了 GitHub Actions 的自动处理逻辑，可以参考使用。
  - 你也可以在构建时手动指定，例如：

```bash
SITE_URL=https://你的用户名.github.io SITE_BASE=/你的仓库名 bun run build
```

## 6. 后续步骤与进阶

- **启用搜索**：构建生产版本后，搜索索引会自动生成。本地预览时若搜索不可用是正常的，部署后即可生效。
- **配置评论**：在 `src/config/site.toml` 的 `[config.comments]` 部分，将 `provider` 设置为 `"giscus"` 或 `"utterances"` 等，并按对应平台的指引完成配置。
- **阅读模块手册**：项目内包含非常详尽的模块说明，存放于 `src/content/blog/` 目录下，强烈建议阅读，以深入了解每个功能模块的用法。

---

**恭喜！** 到这里，你已经拥有了一个属于自己的、功能完整的个人站点。如果遇到任何问题，可以随时查阅项目的 [GitHub 仓库](https://github.com/dodolalorc/astro-navfolio) 或提交 Issue。
