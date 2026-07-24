# Navfolio 主站 Agent 指南

本仓库是可运行的 Astro starter，也是 Navfolio 生态的组合根。它负责站点配置、内容
schema、host adapter、尚未抽取的 UI、构建部署，以及各 `@navfolio/*` 包的集成。
当前产品分支是 `v1`。

## 开始工作

1. 从多仓库工作区进入时，先读 `../AGENT.md`。
2. 读 `../.agents/context/ecosystem-map.md`，确认能力归属和依赖方向。
3. 读本仓库 `.agents/context/current-design.md` 与
   `.agents/context/current-progress.md`。
4. 跨仓库或公共契约变更遵循
   `../.agents/workflows/cross-repository-change.md`。
5. 以当前源码、`package.json`、`bun.lock` 和 workflow 为准，不从旧 RFC 推断现状。

上层工作区目前包含全部 15 个本地仓库，包括 `core`、`theme-default` 和
`page-media`。但本仓库通过 GitHub spec 安装依赖，同级 working tree 不会自动参与
构建；上游变更仍需先推送，再刷新下游 lockfile。

## 当前边界

- `navfolio.config.ts` 显式启用 Projects、Vibe、Media、Pages marker 和 Markdown
  preset。
- `src/config/site.toml` 管理用户可编辑的站点、主题、字体、页面文案、导航、搜索、
  评论和首页配置。
- `src/content.config.ts` 仍集中拥有 Astro collection schemas，并按 module 状态
  条件注册 Projects、Vibe、Media。
- Projects UI 仍在 `src/modules/routes/**`；Vibe 与 Media 使用 package-owned
  routes。
- `src/modules/page-runtime.ts` 是 package-owned route 使用的 host adapter。
- `@navfolio/core` 已同时提供 i18n 与 theme manifest contracts；它不依赖具体主题。
- `@navfolio/theme-default` 提供已抽取的默认主题组件和样式；其余 UI 与兼容 wrapper
  仍属于主站。
- `@navfolio/plugin-markdown` 配置编译管线；`@navfolio/mdx-components` 提供显式
  import 的内容组件。
- `src/docs` 是 `astro-navfolio-docs` 的 submodule，不是普通主站源码目录。
- Friend Circle 已接入部署；WeRead 仍没有主站 consumer。

## 修改规则

- 行为应改在真正的 owner 仓库，不要因为主站是组合根就把逻辑写回主站。
- 页面模块变更同时检查 route、collection、navigation、scaffold、i18n 与
  `virtual:navfolio/page-runtime`。
- 修改 docs 时先提交并推送独立 docs 仓库，再更新主站 submodule 指针。
- 保持 starter/docs 两种内容模式可构建，保持 calm editorial 视觉、可访问性、响应式
  行为和无 JavaScript 的基本可读性。
- 不提交 secret、依赖缓存、临时构建产物或未经明确授权的个人数据快照。
- 保留用户无关改动，不回滚或覆盖任务范围外的工作。

## 验证

先运行最接近变更的测试，再按影响范围执行：

```bash
bun run format:check
bun run build
bun run docs:build
```

可见 UI、路由、导航、样式或 hydration 改动还要进行浏览器检查。

## 维护本仓库 Agent 记忆

- 架构/所有权变化时更新 `.agents/context/current-design.md`。
- 能力接入、撤销或过渡状态变化时更新
  `.agents/context/current-progress.md`。
- 区分“已落地、过渡中、未接入”；只有源码、manifest、lockfile 或 workflow 有证据
  才能标为已落地。
- 历史实施计划保留在 Git/issue/PR，不把已完成清单继续当成当前工作记忆。
