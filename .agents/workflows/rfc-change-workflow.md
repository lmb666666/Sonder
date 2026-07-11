# RFC Change Workflow

Use this workflow for every RFC refactor change.

## 1. Orient

- Read `AGENT.md`.
- Read `.agents/context/issue-68-summary.md`.
- Read the relevant plan in `.agents/plans/`.
- Inspect current imports before moving code.

## 2. Scope

- State which package boundary the change affects.
- List files that are intentionally in scope.
- List files that are intentionally out of scope.
- If a change crosses package boundaries, add or update a plan note first.

## 3. Implement

- Prefer small commits that preserve a runnable site.
- Keep compatibility adapters near the edge, not in core.
- Add types before moving behavior.
- Avoid moving UI and data logic in the same step unless required.

## 4. Verify

- Run `bun run format:check`.
- Run the narrowest build command that covers the touched area.
- Because article content comes from the docs sub-repository mounted at
  `src/docs`, use `bun run docs:dev` for content-aware preview and
  `bun run docs:build` for build verification.
- Use plain `bun run dev` or `bun run build` only when intentionally checking
  the starter/default `src/content` mode.
- For package boundary edits, run import searches with `rg`.

## 5. Record

- Update `.agents/plans/` when assumptions change.
- Add a decision note when choosing package manager, release model, or plugin
  loading mechanism.
- Summarize remaining risks in the PR.
