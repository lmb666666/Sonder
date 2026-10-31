# 参与 Sonder

Sonder 是一份以纸面阅读感为核心的个人发布模板。贡献时请保持页面可读、配置集中、内容可替换，并维持现有的纸面视觉语言。

## 开发环境

```bash
bun install
python3 -m venv .venv
.venv/bin/python -m pip install fonttools brotli   # 构建字体子集需要
bun run dev
```

## 提交前检查

每次提交前至少通过以下三项；改动构建、schema 或路由后必须再跑 `bun run build`：

```bash
bun run format:check   # ESLint + Prettier
bun test               # 单元测试
bun run build          # 完整构建 + Pagefind
```

## 提交规范

- 提交信息简短、具体，使用 `feat:` / `fix:` / `docs:` / `chore:` 前缀
- 不提交构建产物、缓存与本地环境文件（`.gitignore` 已覆盖）
- 一次 PR 聚焦一件事；UI 改动请附浅色与深色两种环境的说明或截图

## 代码与样式约定

- 站点级配置集中在 `src/config/site.toml`，字段结构由 `src/content.config.ts` 的 Zod schema 校验；新增字段需要同步 schema 默认值与[站点配置指南](https://sonder.liang.one/blog/site-config-guide/)
- 颜色使用主题 token（`--paper-*`、`--accent`），不要在页面里写死色值
- 新增交互优先使用原生 HTML 与轻量脚本，保持无框架依赖；深色模式、移动端断点与键盘焦点状态需要一起检查
- 修改导航、文章底部等界面文案时，同步 `src/i18n/` 的 en / zh-CN / zh-TW 三份文案

## 文档

面向使用者的配置与写作文档以指南文章的形式随模板发布在演示站（`src/content/blog/` 下的 `*-guide` 文章）。改动配置项、命令或行为后，请同步更新对应指南与 README 的指南表格。
