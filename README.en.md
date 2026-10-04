<div align="center">

# Sonder

**Write your life down, share your ideas in code**

![Nuxt](https://img.shields.io/badge/Nuxt-4-00DC82?logo=nuxt&logoColor=white)
![Vue](https://img.shields.io/badge/Vue-3-4FC08D?logo=vuedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.5-5FA04E?logo=nodedotjs&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-%3E%3D10-F69220?logo=pnpm&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

</div>

---

📖 README: [简体中文](./README.md) | **English**

🔗 Repository: [github.com/lmb666666/Sonder](https://github.com/lmb666666/Sonder)

- ⚡ **Nuxt 4 + Vue 3 + TypeScript**: works as a static site or a Node server
- ✍️ **Two article layouts**: `tech` for technical posts, `story` for centered prose
- 🎨 **Configure and go**: site identity, homepage, navigation, categories, and theme all live in `blog.config.ts`
- 📚 **Batteries included**: full-text search, archive, friend links, Atom feed, code highlighting, KaTeX, Mermaid, sheet music

<table width="100%" align="center">
  <tr>
    <td align="center">
      <img src="./docs/images/home-light.webp" alt="Homepage">
      <br>Homepage</td>
  </tr>
  <tr>
    <td align="center"><img src="./docs/images/blog-light.webp" width="48%" alt="Article list"><br>Article list</td>
    <td align="center"><img src="./docs/images/guide-light.webp" width="48%" alt="Usage guide"><br>Usage guide</td>
  </tr>
  <tr>
    <td colspan="2" align="center"><img src="./docs/images/handbook-dark.webp" width="48%" alt="Writing handbook (dark)"><br>Writing handbook (dark)</td>
  </tr>
</table>

> [!TIP]
>
> Sonder is a personal blog template forked from [Clarity / blog-v3](https://github.com/L33Z22L11/blog-v3). The default configuration builds out of the box — use it for your own blog, or as a reference project for Nuxt Content.
>
> **If you refer to Sonder's component design or code, please credit the project.**
>
> This English README mirrors the Chinese original. The app has no multilingual UI; `language` only affects the site language and SEO metadata.

## ✨ Features

### Content and writing

- [x] Nuxt Content 3 + Markdown/MDC, with front matter for article metadata
- [x] `tech` / `story` layouts, plus covers, categories, tags, TOC, reading time, and prev/next links
- [x] A numeric `recommend` puts a post in the homepage carousel
- [x] MDC toolbox: Alert, Folding, Tab, Pic, LinkCard, Poetry, Timeline, Chat, and more
- [x] Code highlighting (collapsing, indent guides, diff marks), KaTeX math, Mermaid diagrams, abcjs sheet music

### Site

- [x] Homepage: hero, profile, career, skills, social links, sponsors
- [x] Full-text search (MiniSearch with CJK segmentation), archive, category filter, friend links
- [x] Atom feed, OPML export, sitemap, robots, llms.txt
- [x] Light / dark / system theme, responsive layout
- [x] Optional services: Twikoo comments, Ech0 moments, Friend-Circle-Lite, Meting music resolution

## 🚀 Quick Start

### Requirements

- Node.js `^22.5 || ^23.6 || >=24`, 24 recommended
- pnpm `>=10`; use 11.18.0 for a reproducible install

### Local development

```sh
git clone https://github.com/lmb666666/Sonder.git
cd Sonder
pnpm install --frozen-lockfile
pnpm exec nuxt dev --host 127.0.0.1
```

Open the URL printed in the terminal, usually `http://127.0.0.1:3000`.

Installation runs `prepare`: it clears `.data` and the dependency cache, then runs `nuxt prepare`. Keep `pnpm-workspace.yaml`, the lockfile, and `patches/`. If a frozen install fails, check your Node/pnpm versions first instead of deleting the lockfile. Use `pnpm dev` if you want the browser to open automatically.

### First configuration

The template ships with placeholder values (site name Sonder, author Your Name, domain example.com). Before deploying, change at least:

1. `basicConfig` at the top of `blog.config.ts`: title, subtitle, author, email, and `url` (full address, no trailing slash)
2. The `home` section: greeting, bio, career, skills, social links
3. `article.categories`: category names and icons — every category used in posts must exist here

Then run the config audit:

```sh
pnpm audit:config
```

## 📖 Configuration

Day to day you only edit `blog.config.ts`; the other config files support it:

| File | Purpose |
| --- | --- |
| `blog.config.ts` | Site identity, pages, feature switches, homepage, appearance — your main entry |
| `shared/types/blog-config.ts` | Types for config fields and allowed values |
| `nuxt.config.ts` | Modules, content plugins, SEO, routing, images, build settings |
| `content.config.ts` | Content collections and front matter schema |
| `content/data/friend-feeds.ts` | Friend-link groups and entries; `app/feeds.ts` merges in your own site info |
| `redirects.json` | Old-to-new 308 redirects |
| `app/assets/css/`, `app/shiki.config.ts` | Global styles, font stacks, and syntax highlighting themes |

Main blocks inside `blog.config.ts`:

| Block | What it does |
| --- | --- |
| `basicConfig` | Site title, description, author, copyright, favicon, language, timezone, URL |
| `article` | Category icons and colors, permalink prefix |
| `seo` | Paths excluded from indexing, anti-mirror domain blacklist |
| `features` | Switches and endpoints for comments, moments, circle, music (off by default) |
| `feed` | Atom feed switch, item limit, XSLT styling |
| `home` | Homepage mode (profile page / article list) and section content |
| `nav`, `footer`, `header` | Sidebar, footer navigation, header settings |
| `pages` | Toggles and copy for the home / blog / links / archive pages |
| `theme`, `ui` | Default theme, sidebar, code blocks, carousel, alert styling |
| `pagination`, `generator`, `scripts` | Pagination, post scaffolding script, site-wide scripts |

Every field is documented in the comments of `blog.config.ts` — read it there while you edit. If you change config types, keep `shared/types/blog-config.ts` and the config audit in sync.

## 🔌 Optional services

Comments, moments, circle, and music resolution are off by default. They rely on separately deployed services; set up the endpoint first, then flip the switch:

| Feature | Upstream project | Configuration |
| --- | --- | --- |
| Comments | [Twikoo](https://github.com/imaegoo/twikoo) | `features.comments.enabled`, `twikoo.envId` |
| Moments | [Ech0](https://github.com/lin-snow/Ech0) | `features.moments.enabled`, `apiUrl` |
| Circle | [Friend-Circle-Lite](https://github.com/willow-god/friend-circle-lite) | `features.circle.enabled`, `apiUrl` |
| Music resolution | [Meting](https://github.com/metowolf/Meting) | `features.music.metingApis` |

Ech0 serves your own moment timeline while Friend-Circle-Lite aggregates recent posts from friend sites; both are small services you deploy yourself, then point to with `apiUrl`. Once enabled, pages will send requests to those endpoints, and the KaTeX stylesheet also loads from a CDN — disabling every optional service does not mean zero external requests.

## ✍️ Writing

Posts live in `content/posts/` and can be grouped into year folders. Create one with the interactive script:

```sh
pnpm new            # answer the prompts
pnpm new my-first-post
```

It asks for category, tags, and layout, writes into the current year's folder, generates a random `postid`, and tries to open the file in VS Code.

### Front matter

```yaml
---
title: My first post
description: One sentence about what this post covers.
date: 2026-10-04
updated: 2026-10-04
postid: my-first-post
type: tech
categories: [Notes]
tags: [Random]
draft: false
---
```

| Field | Notes |
| --- | --- |
| `title`, `date`, `description` | Required by the content audit; format dates like `2026-10-04` |
| `postid` | Unique ID that determines the permalink `/posts/<postid>`; don't change it after publishing |
| `type` | `tech` (default) or `story` |
| `categories` | Must match names configured in `article.categories` |
| `tags` | Free-form string array |
| `draft` | Boolean; visible in dev, filtered from production builds — not a privacy mechanism |
| `image` | Cover image; falls back to `ui.article.fallbackCover` |
| `recommend` | Number that puts the post in the homepage carousel; `0` still counts |
| `references` | Array of `{ title, link }` shown at the end of the post |

If you must change the `postid` of a published post, add an old-to-new mapping in `redirects.json`.

### Markdown and MDC

The body is plain Markdown plus a set of MDC components written as `::name{props}`: alerts, collapsibles, tabs, quotes, poetry, image lightboxes, link cards, timelines, chat, sheet music, and more. Props can be inline or written as a YAML block, which reads better for long values:

```mdc
::alert{type="tip" title="Note"}
type can be tip / info / question / warning / error.
::

::pic
---
src: /images/cover.svg
caption: YAML blocks suit long props
---
::
```

The full component list lives in `app/components/content/`, and the [writing handbook](./content/posts/writing.md) demonstrates every component with its props and rendered result. The `Prose*` components render Markdown elements and are rarely called by hand.

The two bundled example posts:

| Example post | Covers |
| --- | --- |
| [Usage guide](./content/posts/guide.md) | Environment, site configuration, friend links, service switches, deployment |
| [Writing handbook](./content/posts/writing.md) | Code blocks, math, diagrams, and every MDC component |

## 🚀 Deployment

### Static site (SSG)

```sh
pnpm generate
pnpm audit:dist
```

Upload the whole `.output/public/` directory to any static host. The host must support directory-index routing such as `/posts/<postid>/index.html`. Domain and paths are baked in at generation time, so regenerate after changing the domain.

### Node server (SSR)

```sh
pnpm build
NITRO_HOST=127.0.0.1 NITRO_PORT=3000 node .output/server/index.mjs
```

Keep the complete `.output/` directory (including `server/` and `public/`), run it under a process manager, and put a reverse proxy in front for HTTPS. The included `edgeone.json` is an EdgeOne example; configure other platforms as needed.

## 🧞 Commands

| Command | What it does |
| --- | --- |
| `pnpm exec nuxt dev --host 127.0.0.1` | Local dev, no browser auto-open |
| `pnpm build` / `pnpm generate` / `pnpm preview` | SSR build / SSG generate / preview build output |
| `pnpm new [name]` | Create a post interactively |
| `pnpm lint` / `pnpm lint:fix` | ESLint + Stylelint check / fix |
| `pnpm typecheck` / `pnpm test` | Type checking / Vitest |
| `pnpm audit:config` | Validate config fields, allowed values, and redirects |
| `pnpm audit:content` | Validate post front matter, categories, dates, and unique IDs |
| `pnpm audit:dist` | Validate build output: post files, feed references, draft leaks |
| `pnpm check:feed [query]` | Check friend-link feeds (makes network requests) |
| `pnpm generate-friend-json` | Generate `public/friend.json` from friend-link data |

Recommended before publishing:

```sh
pnpm audit:config && pnpm audit:content
pnpm lint && pnpm typecheck && pnpm test
pnpm generate && pnpm audit:dist
```

### Dependency patches

`pnpm-workspace.yaml` declares four patches applied on install:

| Patch | Purpose |
| --- | --- |
| `@nuxt/image` | Keep fractional densities like 1.5x; use the Web handler for IPX so static prerendering doesn't stall |
| `@nuxtjs/mdc` | Load TypeScript content plugins, preserve code tabs, pass inline-code text |
| `@vue/shared` | Fix the `IsKeyValues` type's key range and null handling |
| `plain-shiki` | Fix descendant spacing in CSS Highlight selectors |

After upgrading these packages, check that the patches still apply — don't drop them to work around install errors.

## 🙏 Credits

The blog architecture and content components come from [Clarity / blog-v3](https://github.com/L33Z22L11/blog-v3) by [Zhilu](https://github.com/L33Z22L11). Thanks to the original author; Sonder continues to maintain and reshape the project.

Tech stack: [Nuxt](https://nuxt.com) · [Vue](https://vuejs.org) · [Nuxt Content](https://content.nuxt.com) · [Shiki](https://shiki.style) · [Iconify](https://iconify.design) · [KaTeX](https://katex.org) · [Mermaid](https://mermaid.js.org)

## 📄 License

Released under the [MIT license](./LICENSE): use, modify, and distribute freely, as long as you keep the notices below. The bundled example articles and images are covered by the same MIT terms; third-party dependencies, icons, and external services keep their own licenses.

**Copyright:**

- Copyright (c) 2024 [Zhilu](https://github.com/L33Z22L11) - [Clarity / blog-v3](https://github.com/L33Z22L11/blog-v3)
- Copyright (c) 2026-present [Liang](https://github.com/lmb666666) - [Sonder](https://github.com/lmb666666/Sonder)
