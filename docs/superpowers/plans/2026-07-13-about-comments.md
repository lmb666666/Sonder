# About Page Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make About pages honor their `comments` frontmatter while preserving existing blog and project behavior.

**Architecture:** Add a small pure predicate to the existing comments utility that declares which content collections can mount `CommentSection`. Use the predicate in `BlogArticle` so both `blog` and `about` enter the existing comment configuration pipeline, while other collections remain unchanged.

**Tech Stack:** Astro 7, TypeScript 6, Bun test runner, Astro Content Collections

## Global Constraints

- About supports both `src/content/about.md` and `src/content/about.mdx` through the existing collection loader.
- `comments: false` continues to suppress comments through `CommentSection`.
- Projects and other non-blog/non-about collections must not gain comments.
- Do not modify content in the `src/docs` sub-repository.

---

### Task 1: Support About in the comment mount decision

**Files:**

- Create: `src/utils/comments.test.ts`
- Modify: `src/utils/comments.ts`
- Modify: `src/layouts/BlogArticle.astro`

**Interfaces:**

- Consumes: `post.collection?: string` from the existing `BlogArticle` post contract.
- Produces: `supportsCommentSection(collection?: string): boolean` for layout-level comment mounting.

- [x] **Step 1: Write the failing predicate tests**

Create `src/utils/comments.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { supportsCommentSection } from './comments';

describe('supportsCommentSection', () => {
  test('supports blog and about content collections', () => {
    expect(supportsCommentSection('blog')).toBe(true);
    expect(supportsCommentSection('about')).toBe(true);
  });

  test('does not enable comments for other or missing collections', () => {
    expect(supportsCommentSection('projects')).toBe(false);
    expect(supportsCommentSection(undefined)).toBe(false);
  });
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run: `bun test src/utils/comments.test.ts`

Expected: FAIL because `supportsCommentSection` is not exported from `src/utils/comments.ts`.

- [x] **Step 3: Implement the minimal predicate**

Add to `src/utils/comments.ts`:

```ts
const commentSectionCollections = new Set(['blog', 'about']);

export function supportsCommentSection(collection?: string) {
  return collection ? commentSectionCollections.has(collection) : false;
}
```

- [x] **Step 4: Use the predicate in the shared article layout**

Update the comments import in `src/layouts/BlogArticle.astro`:

```ts
import { resolveCommentsConfig, supportsCommentSection } from '../utils/comments';
```

Define the mount decision after `isBlogPost`:

```ts
const shouldMountCommentSection = supportsCommentSection(post.collection);
```

Replace the blog-only render condition with:

```astro
{
  shouldMountCommentSection && (
    <CommentSection frontmatter={post.data} pathname={Astro.url.pathname} />
  )
}
```

- [x] **Step 5: Run the focused test and verify GREEN**

Run: `bun test src/utils/comments.test.ts`

Expected: 2 passing tests and 0 failures.

- [x] **Step 6: Run regression and static verification**

Run: `bun test`

Expected: all tests pass.

Run: `bun run format:check`

Expected: ESLint and Prettier complete with exit code 0.

Run an Astro build with complete temporary giscus environment values and an About fixture whose frontmatter has `comments: true`, then inspect `dist/about/index.html`.

Expected: build exits 0; About output contains `comment-section` and `data-comment-provider=\"giscus\"`. Restoring `comments: false` and rebuilding must remove the comment section.

- [x] **Step 7: Review and commit**

Run: `git diff --check && git status --short`

Expected: only the test, utility, layout, and plan files are changed; no whitespace errors.

Commit:

```bash
git add src/utils/comments.test.ts src/utils/comments.ts src/layouts/BlogArticle.astro docs/superpowers/plans/2026-07-13-about-comments.md
git commit -m "fix: render comments on about pages"
```
