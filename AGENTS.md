# Navfolio / AI-Native Blog System

This project is an AI-native personal blog and digital garden built with Astro.

The project focuses on:

- article-first reading experience
- subtle and lightweight interaction
- notebook-like visual atmosphere
- calm and restrained aesthetics
- implementation-friendly layouts
- modular AI-assisted development

The UI should feel:

- soft but structured
- expressive but not noisy
- dynamic but not exaggerated
- lightweight like GitHub
- readable like a notebook
- slightly playful in motion

Avoid:

- over-designed visuals
- heavy shadows
- excessive gradients
- strong neumorphism
- visually noisy decorations
- oversized floating animations
- random UI invention
- inconsistent spacing systems

---

# Development Philosophy

This repository uses an AI-collaborative architecture.

The project is organized into:

```txt
.agent/
├─ skills/
├─ plans/
├─ reviewers/
└─ workflows/
```

Definitions:

- `skills/`
  Visual language, UI personality, motion style, spacing, aesthetic constraints.

- `plans/`
  Product logic, interaction behavior, state rules, system requirements.

- `reviewers/`
  Self-review standards for UI quality, accessibility, consistency, and performance.

- `workflows/`
  Development processes and engineering conventions.

Always treat these folders as the primary source of truth.

---

# Required Workflow Before Coding

Before implementing any feature:

1. Read related documents under `.agent/plans/`
2. Read related visual skills under `.agent/skills/`
3. Follow reviewer constraints under `.agent/reviewers/`
4. Keep implementation modular and composable
5. Prefer simple architecture over abstraction-heavy patterns

Do not immediately start coding without understanding the related plans and skills.

---

# Visual Design Principles

The project follows these visual rules:

## Layout

- Prefer clean grid systems
- Maintain stable spacing rhythm
- Avoid chaotic asymmetry
- Responsive behavior must feel intentional
- Desktop and mobile layouts should share the same visual language

## Cards

Cards should resemble GitHub-style lightweight grouping:

- extremely subtle borders
- minimal shadow usage
- soft separation instead of strong elevation
- calm background contrast
- avoid thick outlines

## Motion

Motion should feel:

- soft
- restrained
- low-amplitude
- slightly alive

Avoid:

- bouncing
- elastic animations
- large parallax movement
- dramatic hover transforms

Preferred motion:

- opacity fade
- subtle translate
- soft scale
- smooth active-state interpolation

## Typography

Typography is content-first.

Requirements:

- strong readability
- stable vertical rhythm
- avoid oversized headings
- avoid decorative typography
- preserve calm reading flow

Article content is the visual center of the page.

---

# Interaction Principles

Interactions should prioritize:

- reading continuity
- low cognitive load
- subtle feedback
- stable positioning
- predictable behavior

Do not create interaction effects that distract from article reading.

---

# TOC (Table of Contents) Principles

The article TOC is a reading-position indicator, not decorative navigation.

Requirements:

- sync active state with article scroll position
- clicking TOC items smoothly navigates to headings
- active heading updates in real time
- active state should feel lightweight and calm
- use IntersectionObserver instead of heavy scroll calculations

Avoid:

- scroll-jank
- aggressive animations
- excessive active indicators
- flashing transitions

---

# Performance Principles

Performance is part of the design quality.

Always prefer:

- IntersectionObserver over scroll polling
- transform/opacity animations over layout-triggering properties
- lightweight DOM structures
- minimal re-rendering
- implementation simplicity

Avoid:

- expensive scroll listeners
- layout thrashing
- unnecessary observers
- oversized component trees
- excessive client-side hydration

Prefer Astro islands and partial hydration whenever possible.

---

# Astro Conventions

This project is Astro-first.

Preferred stack:

- Astro
- TypeScript
- minimal client hydration
- content collections
- CSS variables
- modular components

Avoid introducing heavy frameworks unless necessary.

---

# Mobile Design Principles

Mobile experience is equally important.

Requirements:

- touch-friendly spacing
- stable scrolling
- lightweight motion
- avoid overcrowded layouts
- preserve reading comfort

Mobile interactions may become:

- card-stack style
- swipe-based sections
- collapsible TOC
- floating utility actions

But should remain implementation-friendly.

---

# AI Collaboration Rules

When implementing:

- follow existing design language
- do not invent unrelated visual styles
- preserve consistency across pages
- reuse spacing/motion systems
- keep components composable

When uncertain:

- prioritize simplicity
- prioritize readability
- prioritize consistency
- prioritize maintainability

Do not optimize prematurely.

---

# Self Review Requirements

Before completing implementation, self-check:

- Is the UI visually lighter or heavier than existing pages?
- Are shadows too noticeable?
- Is spacing still consistent?
- Does motion feel calm?
- Is reading experience uninterrupted?
- Is mobile behavior coherent?
- Does the feature feel integrated into the existing system?

If not, refine before final output.

---

# Desired Feeling

The final experience should feel like:

- a calm digital notebook
- an AI-native personal space
- a modern developer journal
- soft structured minimalism
- subtle emotional motion
- readable and intentional

The design should feel memorable through restraint, not complexity.

```

```
