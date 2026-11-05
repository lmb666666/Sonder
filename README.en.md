<p align="center">
  <img src="./docs/logo-with-name.png" width="420" alt="Sonder" />
</p>

<p align="center">
  A paper-like personal publishing template · Static build with Astro
</p>

<p align="center">
  <a href="https://sonder.liang.one">Live site</a> ·
  <a href="https://sonder.liang.one/blog/get-start/">Guide</a> ·
  <a href="./CONTRIBUTING.md">Contributing</a> ·
  <a href="./README.md">简体中文</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.3.0-8a5a32" alt="version" />
  <img src="https://img.shields.io/badge/Astro-7.1-ff5d01" alt="Astro" />
  <img src="https://img.shields.io/badge/Node-%E2%89%A522.12-339933" alt="Node" />
  <img src="https://img.shields.io/badge/Bun-%E2%89%A51.1-f472b6" alt="Bun" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT" />
</p>

![Sonder homepage](./docs/sonder-preview.png)

Sonder is a personal publishing template built around a paper-like reading experience: warm paper, ink text and hairline rules, bringing articles, media, moments and a friends page into one calm layout. Built statically with Astro; content lives in Markdown with no backend.

## ✨ Features

**Content & layout**

- **Two list layouts** — `media` covers or `rows` list, switchable in config
- **Media / moments / friends** — media shelf, timeline and friend circle out of the box
- **8 palettes + dark mode** — warm orange by default, recolor the whole site
- **Two navigations** — `pill` or `bar`

**Reading experience**

- **TOC & mobile floating TOC** — for long reads, floats from the bottom corner
- **Prev / next & more posts** — generated automatically at the end of articles
- **Share poster** — generate a QR-coded poster or copy a share message
- **Full-text search** — Pagefind static index, `Ctrl+K` / `Cmd+K`

**Site capabilities**

- **Comments** — giscus / utterances / Waline / Twikoo, or none
- **Math & diagrams** — KaTeX / MathJax, Mermaid, ABC music scores
- **Directives (outer tags)** — `:::note` / `:badge` / `::github-card` directives with zero imports, covering callouts, tabs, media, music, friend links and 20+ components
- **Static output** — RSS, Atom, sitemap, llms.txt; on-demand font subsets at build

## 🚀 Quick start

Requirements: Node.js 22.12+, Bun; the first start and build also need Python 3 with fonttools / brotli (font subsets).

```bash
git clone https://github.com/lmb666666/Sonder.git
cd Sonder
bun install
python3 -m venv .venv
.venv/bin/python -m pip install fonttools brotli
bun run dev
```

The dev server runs at `http://localhost:4321`. `dev` runs the cached `fonts:subsets` first; it rebuilds when characters or the source font change. Use `bun run fonts:force` to force a rebuild.

Create a post with `bun run post:new my-post`. Common frontmatter:

```yaml
title: My first post
description: A one-line summary for lists and share cards.
date: 2026-10-31
tags: [essay]
categories: [life]
heroImage: '/src/assets/figure/covers/cover-01-sage.png'
```

## 📖 Guide

The full documentation ships with the demo site and stays in sync with the template:

| Guide                                                                 | Covers                                   |
| --------------------------------------------------------------------- | ---------------------------------------- |
| [Quick start](https://sonder.liang.one/blog/get-start/)               | Site info, writing, build & deploy       |
| [Site config](https://sonder.liang.one/blog/site-config-guide/)       | Every field in `site.config.toml`        |
| [Palettes](https://sonder.liang.one/blog/theme-palettes/)             | 8 palettes and dark mode                 |
| [Components](https://sonder.liang.one/blog/components-showcase/)      | Every directive, live                    |
| [Markdown style](https://sonder.liang.one/blog/markdown-style-guide/) | Typographic rules and extensions         |
| [Search](https://sonder.liang.one/blog/site-search-guide/)            | Pagefind configuration                   |
| [Media page](https://sonder.liang.one/blog/media-page-guide/)         | Entry format and media shelf             |
| [Friends](https://sonder.liang.one/blog/friend-links-guide/)          | Friends, friend circle, application form |

## ☁️ Deploy

The build output in `dist/` deploys to GitHub Pages, Vercel, Netlify, Cloudflare Pages or any static host. For a subpath:

```bash
SITE_URL=https://example.com SITE_BASE=/my-site bun run build
```

## 🛠 Commands

```bash
bun run dev           # local dev server
bun run build         # build (font subsets) + Pagefind index
bun run preview       # preview the build
bun run post:new      # new article
bun run media:new     # new media entry
bun run format:check  # formatting check (ESLint + Prettier)
bun test              # unit tests
```

## 🤝 Contributing

Issues and PRs are welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) first: make `format:check`, `bun test` and `bun run build` pass, and keep the existing visual language.

## 🙏 Credits & license

Sonder is derived from [Navfolio](https://github.com/dodolalorc/astro-navfolio) and maintained by Liang; the share poster references [Firefly](https://github.com/CuteLeaf/Firefly). Copyright notices are preserved in [LICENSE](./LICENSE); released under the MIT license.
