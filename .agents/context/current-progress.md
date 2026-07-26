# 当前进度

最后核对：2026-07-26
证据：当前功能分支、当前 manifests、lockfile、source、deploy workflow 与上层
生态地图。

## 已落地

- Astro 7、Tailwind 4、TypeScript 7 与 Bun 构建工作流。
- `core` 的 i18n runtime 与 theme manifest contracts。
- `theme-default` 的首批 layout/base/blog components、palette/global/blog/layout
  styles，以及主站 compatibility wrappers。
- `pages` protocol、module resolution/validation、官方 factory 导出、scaffold/i18n
  聚合，以及页面包自带 Markdown 模板的标准变量渲染。
- `post:new`、`project:new`、`vibe:new`、`media:new` 统一使用
  `<filename> [output-directory]` 参数；默认 frontmatter 和正文不再硬编码在脚本。
- Projects、Vibe、Media 的 starter 显式注册；Vibe 和 Media 的 package-owned
  routes。
- Markdown preset 对 Expressive Code、callout、columns/timeline、responsive
  tables、Mermaid 和 math 的组合。
- `mdx-components` 的显式内容 components/runtime helpers，包括友链申请表单、
  字段数据复制与 GitHub Issue/Issue Form 预填。
- 首页 dashboard、Blog archive/category/series/tag、搜索、评论、多语言 UI。
- starter 与 docs/demo 双内容模式。
- Friend Circle build-time sync、静态 JSON consumer 和字体子集联动。

## 过渡中

- `core` 的共享契约范围仍小于长期完整 orchestration 目标。
- `theme-default` 只覆盖部分 UI；首页 widgets、Projects、部分 blog/comment/search
  UI 和 wrappers 仍在主站。
- Projects 尚未像 Vibe/Media 一样拥有 package route/UI。
- collection schemas 仍由主站集中定义。
- GitHub dependencies 通过远端 commit 和 lockfile 集成，没有统一的 sibling
  workspace linking。
- deploy 使用 docs submodule `--remote`，但本地可复现仍依赖正确提交 gitlink。

## 已存在但未接入主站

- `weread-sync` 可输出隐私过滤的版本化阅读快照和可选 sanitized insights；主站没有
  consumer。
- `page-template` 是第三方 page module 参考，不是主站运行时依赖。

## 不是当前组件

旧提案中的 `@navfolio/types`、`@navfolio/utils`、
`@navfolio/plugin-blog`、`create-navfolio` 和“完整 orchestration core”都不能当作
已落地 package。只有 manifest、源码、consumer 与 lockfile 有证据时才更新状态。

## 状态维护

- 合并 package 代码不等于完成集成；还需确认 downstream pin、lockfile、docs 和
  build。
- package 存在不等于完成长期目标；只记录当前 exports 和 consumer。
- 下一阶段工作由 issue/PR/用户任务定义，不在本文件维护建议 backlog。
