# Quartz Reference Model

Sources:

- https://github.com/jackyzha0/quartz
- https://github.com/orgs/quartz-community/repositories

## What To Borrow

Quartz v5 keeps a central product repository for the main static-site generator
and documentation entry point. Its repository exposes a `quartz/` source tree,
docs/content areas, config defaults, lock files, and CLI entry points. The main
repo remains the place where users understand the product and start from a
cohesive experience.

The `quartz-community` organization hosts many focused plugin repositories.
Examples visible from the organization list include `fonts`,
`alias-redirects`, `unlisted-pages`, `tag-page`, `tag-list`,
`table-of-contents`, `search`, `recent-notes`, `reader-mode`,
`plugin-template`, `page-title`, `og-image`, `obsidian-flavored-markdown`,
`note-properties`, `graph`, `footer`, `folder-page`, `explorer`,
`encrypted-pages`, `description`, `darkmode`, `crawl-links`, `content-page`,
`content-meta`, `content-index`, and `comments`.

## Interpretation For Navfolio

Use the same collaboration shape:

- One canonical core repository remains the product anchor:
  `dodolalorc/astro-navfolio` during the refactor and `navfolio/core` once the
  ecosystem is ready.
- The `navfolio` organization hosts composable packages, each with one clear
  purpose and an independent issue/PR/release stream.
- Shared contracts live in `@navfolio/types` so plugins do not depend on the
  default theme or app implementation details.
- Official plugins should be small enough to review and version independently,
  but documented together through the core docs and package registry.
- A plugin template should exist early so new packages begin with the same
  scripts, tests, package metadata, CI, and release conventions.

## Collaboration Rules

- Core owns contracts, orchestration, compatibility, and migration.
- Plugins own feature behavior, Astro integrations, content collections, and
  package-level tests.
- Theme owns UI surfaces and component styling, not content collection logic.
- Docs should describe both the user path and the package maintainer path.
- Cross-package changes require an RFC note before code movement.
