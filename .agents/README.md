# Navfolio 主站 Agent 工作区

这里仅保存 `astro-navfolio` 自己的当前工作记忆。跨仓库所有权、依赖图和变更顺序由
上层 `../../.agents/` 维护，避免两套生态地图漂移。

读取顺序：

1. `../AGENT.md`
2. `context/current-design.md`
3. `context/current-progress.md`
4. 跨仓库任务再读上层 `../../.agents/context/ecosystem-map.md` 与对应 workflow

维护规则：

- `current-design.md` 只记录当前产品形态和真实实现边界。
- `current-progress.md` 只记录已落地、过渡中、未接入状态，不保存历史任务清单。
- 当前源码、manifest、lockfile 和 workflow 高于这些文档；发现漂移就同步修正。
- 不保存 secret、生成数据、缓存、构建产物或已完成的大型计划。
- docs 内容属于 `src/docs` submodule，按上层跨仓库 workflow 操作。
