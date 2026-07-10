# Skill Research Notes

Date: 2026-07-10

This note records the external skills reviewed for the Navfolio RFC refactor
workspace and the adaptation decision for each one. The local files under
`.agents/skills/` are project-specific summaries and operating rules; they are
not verbatim copies of upstream skill files.

## Sources Reviewed

- `RobMitt/grill-me-skill`: a compact `grill-me` skill for stress-testing a
  plan or design through focused questioning.
  Source: https://github.com/RobMitt/grill-me-skill
- `mattpocock/skills`: a broader engineering skill collection. Its README
  describes `/grill-me` and `/grill-with-docs`; the latter extends a grilling
  session with shared language, context documents, and ADR-oriented capture.
  Source: https://github.com/mattpocock/skills
- `obra/superpowers`: a composable software development methodology and skills
  framework for coding agents, emphasizing design alignment, small plans,
  verification, TDD, review, and checkpoints.
  Source: https://github.com/obra/superpowers
- `PeterHdd/agent-skills`: a collection of engineering skills following an
  agent skills layout with `SKILL.md`, references, and scripts. It is useful as
  a structural reference, but its broad engineering skills are not imported into
  this repository.
  Source: https://github.com/PeterHdd/agent-skills

## Suitability For Navfolio

### `grill-me`

Useful for this project because the RFC refactor has ambiguous package
boundaries and ownership questions. It should be used before large architecture
changes, before extracting a package, or when a GitHub issue leaves behavioral
scope unclear.

Local adaptation: `.agents/skills/grill-me.md`

### `grill-with-docs`

Highly useful for this project because Navfolio is moving from one Astro theme
repository into a core plus plugin ecosystem. Architecture decisions need to be
grounded in issue #68, Quartz references, current source files, and project
plans. The local adaptation requires cited evidence and follow-up updates to
context or ADR-style notes.

Local adaptation: `.agents/skills/grill-with-docs.md`

### `super-power-skill`

There is no single canonical `super-power-skill` file found under that exact
name. The closest fit is the Superpowers methodology: a router-like discipline
for choosing the right skill, creating small plans, verifying work, and
reviewing before completion. This is suitable as a lightweight local
orchestration skill rather than a full external framework import.

Local adaptation: `.agents/skills/super-power-skill.md`

## Import Policy

- Do not paste third-party skill bodies into this repository unless the license
  and attribution path are explicitly reviewed.
- Prefer local, project-specific adaptations that reference upstream concepts
  and preserve Navfolio's existing `.agents` conventions.
- Keep skills concise enough for future coding agents to actually read before
  acting.
