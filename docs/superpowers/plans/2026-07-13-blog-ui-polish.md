# Blog UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve blog navigation, article tag spacing, and long pagination while preserving existing routes and visual language.

**Architecture:** Keep presentation changes in the existing Astro components, extract pagination sequencing and topic-overflow decisions into small TypeScript utilities, and bind responsive topic measurement in the existing group-nav client module. Pure utilities provide deterministic Bun tests; Astro build and browser inspection cover rendered integration.

**Tech Stack:** Astro 7, TypeScript 6, Bun test, Lucide Astro, component-scoped CSS

## Global Constraints

- Do not change content models, routes, translation copy, or pagination URLs.
- Do not add dependencies.
- Preserve topic-chip and previous/next pagination styling.
- Ellipsis tokens must not be links or keyboard-focusable.
- Scope tag spacing to the shared article header used by blog detail and About pages.

---

### Task 1: Pagination sequence utility and rendering

**Files:**

- Create: `src/utils/pagination.ts`
- Create: `src/utils/pagination.test.ts`
- Modify: `src/components/blog/BlogArchive.astro`

**Interfaces:**

- Produces: `getPaginationItems(currentPage: number, lastPage: number): Array<number | 'ellipsis'>`
- Consumes: `BlogArchive.astro` maps numbers to links and `ellipsis` to inert spans.

- [ ] **Step 1: Write failing pagination tests**

Cover totals up to eight and representative states `(1, 15)`, `(6, 15)`, `(9, 15)`, `(12, 15)`, and `(15, 15)` with exact expected arrays.

- [ ] **Step 2: Verify RED**

Run: `bun test src/utils/pagination.test.ts`

Expected: FAIL because `src/utils/pagination.ts` does not exist.

- [ ] **Step 3: Implement the minimal sequence function**

Return all pages for `lastPage <= 8`; otherwise render the leading six, a sliding four-page window bracketed by endpoints and ellipses, or the trailing six according to the approved zones. Clamp current page and avoid duplicate endpoints.

- [ ] **Step 4: Verify GREEN**

Run: `bun test src/utils/pagination.test.ts`

Expected: all pagination tests pass.

- [ ] **Step 5: Render the utility output**

Import `getPaginationItems` in `BlogArchive.astro`. Render numbers with the existing `.pagination-number` anchor and render ellipses as `<span class="pagination-ellipsis" aria-hidden="true">…</span>`. Add matching non-interactive sizing styles.

### Task 2: Responsive topic toggle

**Files:**

- Modify: `src/utils/group-nav.ts`
- Create: `src/utils/group-nav.test.ts`
- Modify: `src/components/blog/GroupNav.astro`
- Modify: `src/components/Icon.astro`

**Interfaces:**

- Produces: `hasTopicOverflow(scrollHeight: number, clientHeight: number): boolean`
- Consumes: group-nav binding measures the collapsed topic list and toggles the control's hidden state.

- [ ] **Step 1: Write failing overflow tests**

Assert equal heights do not overflow and a scroll height one pixel larger does overflow.

- [ ] **Step 2: Verify RED**

Run: `bun test src/utils/group-nav.test.ts`

Expected: FAIL because `hasTopicOverflow` is not exported.

- [ ] **Step 3: Implement overflow measurement and lifecycle**

Export the pure predicate. In the binder, temporarily measure the collapsed list, set `toggle.hidden`, reset expansion when overflow disappears, update label/ARIA state, and remeasure through `ResizeObserver`. Disconnect observers on `astro:before-swap`.

- [ ] **Step 4: Verify GREEN**

Run: `bun test src/utils/group-nav.test.ts`

Expected: all group-nav utility tests pass.

- [ ] **Step 5: Polish the control**

Add `chevron-down` support to `Icon.astro`; render it beside the toggle label. Remove toggle border, background, shadow, and lift transform while preserving a clear hover/focus-visible color treatment. Rotate the icon when expanded.

### Task 3: Group-link icons and article tag spacing

**Files:**

- Modify: `src/components/blog/GroupNav.astro`
- Modify: `src/components/article/ArticleHeader.astro`

**Interfaces:**

- Consumes: existing `Icon` names `layers`, `tags`, and `calendar`.
- Produces: decorated group links and scoped spacing between article-header tag anchors.

- [ ] **Step 1: Add semantic group-link icon markup**

Import `Icon` in `GroupNav.astro`, insert 15px decorative icons before each label, and align each anchor as an inline-flex row with a small gap.

- [ ] **Step 2: Add scoped tag spacing**

Identify the article-header tag link selector and give adjacent tags a small `margin-inline-start` or the tag container a `column-gap`, without changing BlogPostList metadata.

- [ ] **Step 3: Run focused formatting and tests**

Run: `bun test src/utils/pagination.test.ts src/utils/group-nav.test.ts`

Expected: all tests pass.

### Task 4: Integration verification, review, commit, and push

**Files:**

- Review all files changed since `v1`.

**Interfaces:**

- Produces: verified branch `chore/blog-ui-polish` on `origin` and a PR-ready change summary.

- [ ] **Step 1: Run repository checks**

Run: `bun run format:check`

Expected: exit 0.

Run: `bun run build`

Expected: exit 0; pre-existing content-directory and chunk-size warnings may remain.

- [ ] **Step 2: Inspect the rendered pages**

Start the local Astro server and inspect `/blog/`, `/about/`, and a paginated fixture or generated pagination markup at desktop and mobile widths. Confirm overflow visibility, icon alignment, tag spacing, inert ellipses, and keyboard focus behavior.

- [ ] **Step 3: Self-review**

Run `git diff v1...HEAD` plus the uncommitted diff, check every user requirement, accessibility semantics, resize cleanup, pagination boundaries, and unrelated changes. Fix any issue and rerun checks.

- [ ] **Step 4: Commit and push**

Stage only intended files, commit with `chore: polish blog navigation and pagination`, then run `git push -u origin chore/blog-ui-polish`.

- [ ] **Step 5: Prepare PR description**

Summarize the four user-visible changes and list the exact test, format, build, and visual verification performed.
