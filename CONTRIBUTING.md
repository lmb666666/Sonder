# 参与 Sonder

Sonder 是一份 Astro 个人发布模板。贡献时请保持页面可读、配置集中、内容可替换，并维持现有的纸面视觉语言。

## 项目结构

- `src/config/site.toml`：站点、作者、导航、页面文案、首页和功能开关
- `src/content.config.ts`：站点配置与内容集合的 Zod schema
- `src/content/`：about、blog、media、projects 内容
- `src/components/`：页面组件、卡片、博客工具和首页 widget
- `src/components/theme/`：主题组件与样式
- `src/modules/`、`src/plugins/`、`src/framework/`：页面模块与 Markdown 能力
- `sonder.config.ts`：页面模块和插件注册

## 内容

- 文章、书影音和项目内容使用 Markdown / MDX。
- 友链、朋友圈演示数据和动态演示数据在 `src/data/`。
- 新增文章前，先确认 frontmatter 字段符合 `src/content.config.ts` 中的 schema。
- 示例内容应解释 Sonder 本身或展示某项能力，避免加入与模板无关的长篇素材。

## 开发

```bash
bun install
bun run dev
bun run lint
bun run format:check
bun test
bun run build
```

提交前至少运行 `bun run lint`、`bun run format:check` 和 `bun test`。修改构建、schema 或页面路由后还要运行 `bun run build`。

## 视觉与交互

- 使用 `src/config/site.toml` 的主题色盘和 CSS 变量，不要在各页面重复写死颜色。
- 新增交互时优先使用原生 HTML 和轻量脚本；需要客户端状态时，保持无框架依赖。
- 深色模式、移动端断点和键盘焦点状态需要一起检查。

## 提交

- 提交信息保持简短、具体。
- 不提交构建产物、缓存或本地环境文件。
- 涉及依赖、配置 schema 或公开 API 的改动，请同时更新 README 和相关文档。
