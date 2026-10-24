---
title: 'Navfolio Ecosystem'
description: 'A practical map of Navfolio’s Markdown plugins, reusable content components, page modules, and build-time sync workflows.'
date: '2026-07-20T00:00:00+08:00'
draft: false
sticky: false
showHeroImage: false
icon: layers-3
iconColor: 'var(--paper-accent)'
authors:
  - name: 'Navfolio'
links:
  - label: 'astro-navfolio'
    href: 'https://github.com/navfolio/astro-navfolio'
    kind: github
tags:
  - Astro
  - Plugins
  - Workflow
comments: false
sidebar:
  enable: false
  toc: true
  relatedPosts: false
---

Navfolio is deliberately split into small packages. The starter remains the place where a site chooses its theme, content schemas, and routes; packages supply a focused capability without making the whole site depend on one large framework layer.

## Markdown pipeline

`@navfolio/plugin-markdown` is the recommended Markdown preset. It assembles expressive code blocks, math rendering, Mermaid diagrams, responsive tables, and callouts behind one configuration entry. Use it when a site wants Navfolio’s default writing experience but still needs to disable individual capabilities.

`@navfolio/plugin-callout` is the lower-level piece of that pipeline. It turns Obsidian-style blockquotes such as `> [!tip]` into semantic callout markup, supports aliases and collapsed or expanded details, and can also be used directly as a Remark plugin outside Navfolio.

## Components for MDX

`@navfolio/mdx-components` contains author-facing blocks rather than Markdown transforms. Its main building blocks include friend-link cards, the static friend-circle feed, image and carousel helpers, Mermaid initialisation, music players, zoomable images, and `MediaShelf` for book, film, and music entries.

This boundary is intentional: use a Markdown plugin when changing how source text is parsed; import an MDX component when an article needs an explicit visual block.

## Page modules and shared runtime

`@navfolio/core` provides stable cross-module contracts, currently centred on the dependency-free i18n catalog runtime. `@navfolio/pages` collects enabled page modules and their catalogs, normalises their routes, and exposes the public `pages()` integration.

The concrete modules remain independent:

- `@navfolio/page-projects` supplies the Projects capability and its content scaffold.
- `@navfolio/page-vibe` owns the Vibe route, image layout, progressive stream interactions, and content scaffold.
- `@navfolio/page-media` creates the anchor-linked books, films, and music shelf, review routes, and media scaffold.
- `@navfolio/page-template` is the smallest starting point for a custom injected Astro page.

Enable only the modules a site needs in `navfolio.config.ts`; their routes,
navigation targets, collections, and `<page>:new` scaffold commands follow that
configuration. Each content-producing module publishes its own editable
`templates/default.md` instead of embedding frontmatter in the host.

## Independent build-time workflows

Two repositories focus on data collection before the static site build rather than on rendering UI.

`@navfolio/friend-circle-sync` reads a friend-links list, fetches RSS or Atom feeds, normalises them, and writes a static JSON file. It runs as either a Bun CLI or GitHub Action before deployment, so visitors do not make cross-origin feed requests.

`@navfolio/weread-sync` exports a privacy-aware WeChat Reading snapshot through GitHub Actions. It can include reading progress and aggregate statistics, and can optionally create a short AI insight only after the public-safe snapshot is produced. API keys stay in GitHub Secrets; private titles, highlights, notes, and raw gateway responses should not enter the repository.

Together these workflows keep network access and sensitive credentials in CI, while the published Astro site reads only generated static data.

## Choosing an entry point

For a normal Navfolio site, start with `@navfolio/plugin-markdown`, `@navfolio/pages`, and only the page modules you enable. Add `@navfolio/mdx-components` when an article needs a component. Add a sync workflow only when its generated data has a clear public presentation and a safe CI boundary.
