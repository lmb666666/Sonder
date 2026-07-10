# Issue 68 Summary: Navfolio v1.0.0 Core and Plugin Ecosystem

Source: https://github.com/dodolalorc/astro-navfolio/issues/68

## Problem

Navfolio is currently a full Astro personal dashboard theme where core layout,
content handling, UI components, utilities, search, comments, math, MDX, and
site features live in one repository. This helped early iteration, but it makes
extension, customization, maintenance, and reuse increasingly expensive.

## Target Architecture

Move Navfolio toward a core framework plus plugin ecosystem:

- `@navfolio/core`: configuration loading, Astro integration entry, plugin
  lifecycle, CLI primitives.
- `@navfolio/types`: shared TypeScript contracts for plugins, config schema,
  lifecycle hooks, content collection extensions, and package APIs.
- `@navfolio/utils`: shared helpers such as dates, grouping, text, images, and
  content utilities.
- `@navfolio/plugin-blog`: blog collections, archives, tags, series, RSS.
- `@navfolio/plugin-vibe`: short-form Vibe content.
- `@navfolio/plugin-projects`: project/documentation content.
- `@navfolio/plugin-search`: Pagefind-based search integration.
- `@navfolio/plugin-comments`: comment adapters such as giscus, utterances, and
  waline.
- `@navfolio/plugin-mdx`: MDX content enhancements.
- `@navfolio/plugin-math`: KaTeX/math rendering support.
- `@navfolio/theme-default`: default layouts, components, styles, and visual
  system.
- `create-navfolio`: project scaffolding.

## Proposed Plugin Shape

The RFC proposes a Navfolio plugin contract that wraps Astro Integration
semantics:

```ts
import type { AstroIntegration } from 'astro';
import type { NavfolioConfig } from './config';

export interface NavfolioPlugin {
  name: string;
  version?: string;
  description?: string;
  astroIntegration: (config: NavfolioConfig) => AstroIntegration;
  contentCollections?: Record<string, unknown>;
  hooks?: {
    onConfigLoaded?: (config: NavfolioConfig) => NavfolioConfig | void;
    onBuildStart?: () => void | Promise<void>;
    onBuildEnd?: () => void | Promise<void>;
  };
}
```

## Phases

1. Foundation: create core/types/utils, plugin interface, config schema,
   pnpm workspace, and Changesets.
2. Extraction: split blog, vibe, projects, search, comments, math, MDX, and
   default theme.
3. Migration and docs: migration CLI, user guide, examples, beta.
4. Ecosystem: v1.0.0 release, plugin development guide, templates, official
   plugin directory, contribution guidance.

## Open Decisions

- Monorepo tooling: pnpm workspace first; decide whether Turborepo is needed.
- Plugin loading: Astro `integrations` only, or Navfolio-level `plugins` array.
- Theme boundary: keep `@navfolio/theme-default` independent from core.
- Compatibility: define the v0.x maintenance window after v1.0.0.
