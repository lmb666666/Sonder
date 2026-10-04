# 贡献指南

感谢你有兴趣为 Sonder 提交代码、内容或文档改进。动手之前先看下这几条，能省不少来回。

## 开始之前

大的改动（新功能、界面调整、重构）建议先开 [Issue](https://github.com/lmb666666/Sonder/issues) 聊一下方向，避免写完才发现不合适。

## 开发环境

推荐 Node.js 24 和 pnpm 11.18.0：

```sh
pnpm install --frozen-lockfile
pnpm exec nuxt dev --host 127.0.0.1
```

`pnpm-workspace.yaml`、锁文件和 `patches/` 是配套的，不要单独删改。

## 修改原则

- **把问题说清楚**：修 bug 请给出复现步骤和预期行为，改动聚焦根因，别顺手大范围重构。
- **配置进 `blog.config.ts`**：新增站点可配置项时，同步更新 `shared/types/blog-config.ts`、用到的组件和配置审计。
- **接口变更要成组**：Front Matter 字段、文章路径、MDC 组件的 props 或插槽发生变化时，同步 schema、插件、审计脚本和示例文章。已发布文章的 `postid` 不要改；确实要改就在 `redirects.json` 里补映射。
- **外部服务默认关闭**：新增服务用空值或示例值，说明启用后会发什么请求，配置里不要放密钥。
- **素材要有来源**：只提交原创或明确可再分发的资源，记录作者、来源和许可；不要提交个人文章、私人图片或来源不明的字体。
- **升级依赖要成对**：改版本目录或锁文件时检查受影响的补丁。`pnpm bump` 会重建锁文件，只在计划升级时用。

## 提交前检查

代码、内容、构建相关的改动按需要跑：

```sh
pnpm audit:config
pnpm audit:content
pnpm lint
pnpm typecheck
pnpm test
```

涉及静态输出、文章路由、SEO 或订阅的，再加：

```sh
pnpm generate
pnpm audit:dist
```

只改文档的话不用构建，检查命令、路径和链接真实存在即可。

提 PR 时说明改了什么、怎么验证的；跑了哪些检查、哪些没跑，如实写就行。不要把 `node_modules/`、`.nuxt/`、`.output/`、`.data/` 或临时文件带进提交。自动修复请限定在自己改过的文件。

## 文档同步

[README.md](./README.md) 和 [README.en.md](./README.en.md) 需要保持一致，改了其中一份记得同步另一份。

## 许可

提交贡献时请确认你有相应的权利，并按下面的范围授权：

| 贡献内容 | 许可 |
| --- | --- |
| 项目代码、配置、脚本、文档、示例文章与示例图 | [MIT](./LICENSE) |
| 第三方资源 | 保留原许可与声明 |

请保留 Clarity / Zhilu 的上游署名和版权声明。遇到版权不明的素材，先别提交。
