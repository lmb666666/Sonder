# VENDORED — 收编自 navfolio 生态的包清单

单仓收编于 2026-10-24（M1）。各包源码取自 bun 安装时的 GitHub 解析结果
（commit hash 即当时安装版本），tsc dist 编译层全部拆除，Astro/Vite/Bun
直接消费 TS 源码。各包 LICENSE 随源码保留在对应目录。

上游主仓：dodolalorc/astro-navfolio @ v1 `70aa71ddd9f7ee4af38fa5810b320820712f1885`（remote 名 `upstream`，只读）。

| 包                                | 来源 commit | 落位                                                 | 说明                                                                                                                                                                                                  |
| --------------------------------- | ----------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| @navfolio/core                    | `1e7954f`   | `src/framework/`                                     | 契约 / i18n / 主题清单                                                                                                                                                                                |
| @navfolio/pages                   | `cd6e6fc`   | `src/modules/`（index/config/plugin/scaffold/types） | 聚合器，与既有 page-runtime.ts、routes/ 合并共存                                                                                                                                                      |
| @navfolio/page-projects           | `e72c990`   | `src/modules/projects/`                              | 含 templates/                                                                                                                                                                                         |
| @navfolio/page-vibe               | `0c2f868`   | `src/modules/vibe/`                                  | 含 routes/、templates/                                                                                                                                                                                |
| @navfolio/page-media              | `788affd`   | `src/modules/media/`                                 | 含 routes/、templates/                                                                                                                                                                                |
| @navfolio/mdx-components          | `b1d864a`   | `src/components/mdx/`                                | 9 个内容组件 + lib/。注：M0 构建时 page-media 曾嵌套解析旧版 `6997956`（仅 FriendLinkCard 缺 preview 态、无 FriendLinkApplication），实际渲染用到的 MediaShelf 两版逐字节一致，统一为根版本不影响基线 |
| @navfolio/plugin-markdown         | `dfba520`   | `src/plugins/markdown/`                              | 含 styles.css                                                                                                                                                                                         |
| @navfolio/plugin-callout          | `9d6ecca`   | `src/plugins/markdown/callout/`                      | 含 styles.css                                                                                                                                                                                         |
| @navfolio/plugin-markdown-layouts | `6b44c38`   | `src/plugins/markdown/layouts/`                      | 含 styles.css                                                                                                                                                                                         |
| @navfolio/theme-default           | `0be2d98`   | `src/components/theme/`                              | components/ + styles/                                                                                                                                                                                 |

## 解析方式

- `@navfolio/*` 标识符**不改写**：tsconfig `compilerOptions.paths` + `astro.config.mjs`
  的 Vite `resolve.alias` 将其指向上述本地目录。全部消费文件（含 .mdx 内容）
  零改动。
- **已知例外（2 个文件改相对引用）**：`navfolio.config.ts` 与 `src/plugins/config.ts`
  处于 Astro 配置加载闭包内，该阶段 Vite alias 尚未生效，故改为相对路径导入。
- **聚合层包间引用改相对路径**（收编后即仓内路径）：`src/modules/index.ts`、
  `src/modules/config.ts`、`src/modules/{projects,vibe,media}/i18n.ts`、
  `src/plugins/markdown/markdown.ts`（`require.resolve` 改为 `fileURLToPath(new URL(...))`）。
- page 模块内 `new URL('../routes/…')` / `'../templates/…'` 随扁平化改为 `'./…'`（6 处）。
- 包内相对导入保留上游的 `.js` 后缀风格（Bun 与 Vite extensionAlias 均可解析回 `.ts`）。

## 依赖合并

`fast-xml-parser`、`rehype-katex`、`rehype-mathjax`、`remark-math` 并入根
package.json（原为各包自持）。`@fontsource/maple-mono`、`lucide-astro`、
`astro-expressive-code` 根内已有，满足版本约束。`bun.lock` 无任何 `github:` 残留。

## 其他调整

- `src/utils/{remark-mermaid,rehype-responsive-tables}.ts`：上游遗留的重复副本
  （与 plugin-markdown 源码逐字节一致，全仓无引用），保留未动，待后续清理。
- `.husky/pre-commit`：原 `bun run build` 在无 `src/content` 时必失败（模板自带矛盾），
  先改为 docs 源构建，M3 内容收编后恢复默认 `bun run build`。
- `src/plugins/config.test.ts`：两处路径断言从 node_modules 布局更新为收编后布局。

## 基线对照

M0（收编前）截图：`screenshots/m0-baseline/`；M1（收编后）：`screenshots/m1-vendored/`。
像素对比（ImageMagick AE，fuzz 0）：每页差异 0–24 px / 数百万像素（≈3ppm，
均匀散布的抗锯齿噪声，无结构位移）；vibe 页 0 像素。构建产物 73 页与 M0 一致。
