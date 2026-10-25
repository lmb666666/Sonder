<p align="center">
  <img src="./public/images/logo-with-name.png" width="420" alt="Sonder" />
</p>

<p align="center">万千人生，各自成书。</p>

<p align="center">
  <a href="https://sonder.liang.one">在线预览</a> ·
  <a href="https://github.com/lmb666666/Sonder">GitHub</a>
</p>

![Sonder 首页](./public/images/sonder-preview.png)

Sonder 是一份以纸面阅读感为核心的个人发布模板，使用 Astro 静态构建、Bun 运行脚本。它把文章、书影音、动态、朋友页和个人资料放在同一套版式里，适合长期写作与个人出版。

## 特性

- 纸面视觉：暖白底色、墨色文字、发丝线与低饱和色盘
- 文章：16:9 封面、磨砂信息条、分类、标签、目录、上下篇与更多文章
- 深色模式：按封面主色生成深色玻璃信息条与同色系外框
- 首页：身份、统计、写作热力图、站点信息与最新文章
- 页面：书影音媒体架、动态时间线、朋友页与朋友圈
- 导航：`pill` 胶囊导航、`bar` 通栏工具条与 `legacy` 旧版通栏 Header 三种样式
- 搜索：Pagefind 静态全文索引，支持 `Ctrl+K` / `Cmd+K`
- 评论：giscus、utterances、Waline、Twikoo，可关闭
- 分享：文章底部复制带链接的分享文案，或生成带二维码的分享海报
- 静态输出：RSS、Atom、sitemap；构建后部署到任意静态托管

## 快速开始

需要 Node.js 22.12+ 和 Bun。

```bash
git clone https://github.com/lmb666666/Sonder.git
cd Sonder
bun install
bun run dev
```

开发服务器默认运行在 `http://localhost:4321`。

构建会按内容生成中文字体子集，首次构建前需要 Python 3 + fonttools/brotli：

```bash
python3 -m venv .venv
.venv/bin/python -m pip install fonttools brotli
```

## 配置

站点级信息集中在 `src/config/site.toml`：

- `[config.site]`：站点标题、描述、线上地址、仓库地址和页脚说明
- `[config.profile]`：作者名、身份、头像、邮箱、网站与 GitHub
- `[config.siteInfo]`：站点信息卡；`program` 同时用于页脚 Powered by
- `[[config.topNav.links]]`：顶部导航
- `[config.theme]`：默认色盘、界面语言和 `navStyle`（`pill` / `bar` / `legacy`）
- `[config.pages]`：文章、书影音、动态、朋友页的标题、kicker 与说明
- `[config.article]`：文章底部分享、上一篇/下一篇、更多文章开关
- `[config.home]`：首页引语、介绍、最新文章数量、联系方式
- `[config.search]`、`[config.comments]`、`[config.friendCircle]`：搜索、评论和朋友圈

配置结构由 `src/content.config.ts` 中的 Zod schema 校验；字段缺失或类型不对时构建会直接报错。页面模块在 `sonder.config.ts` 中注册，当前启用书影音模块。

## 内容

```text
src/content/
  about.mdx        关于页
  blog/            长文与教程
  media/           书、影、音条目
  projects/        关于页项目卡片
```

示例文章、书影音条目和项目卡片都可以直接编辑或删除。文章封面放在 `src/assets/figure/covers/`，也可以换成自己的图片。

## 常用命令

```bash
bun run dev          # 本地开发
bun run build        # 构建静态站点（含字体子集）+ Pagefind 索引
bun run preview      # 预览构建产物
bun run post:new     # 新建文章
bun run media:new    # 新建书影音条目
bun run format:check # 格式检查
bun run lint         # ESLint
bun test             # 单元测试
```

## 部署

构建产物在 `dist/`，可以手动部署到 GitHub Pages、Vercel、Netlify 或 Cloudflare Pages。仓库不内置部署工作流或平台配置文件。

部署到子路径时：

```bash
SITE_URL=https://example.com SITE_BASE=/my-site bun run build
```

## 目录

```text
src/
  components/       页面组件、卡片、博客工具和首页 widget
  config/site.toml  站点配置
  content/          about、blog、media、projects
  layouts/           基础布局与文章布局
  pages/             Astro 路由
  i18n/              中文、繁体中文和英文界面文案
  data/              友链、动态、站点配置 helper
sonder.config.ts     页面模块与插件注册
```

## Credits & License

Sonder 是基于 Navfolio 二次开发的独立模板，由 Liang 开发维护。上游项目采用 MIT 许可。Navfolio 与 Sonder 的版权声明统一保留在根目录 `LICENSE` 中。

文章分享海报的布局和二维码生成逻辑参考了 [Firefly](https://github.com/CuteLeaf/Firefly)，其版权声明也已并入根目录 `LICENSE`。

本项目同样以 MIT 许可发布。
