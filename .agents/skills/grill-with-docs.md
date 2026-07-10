# Skill: Grill With Docs

Use this skill when alignment questions must be grounded in written evidence.
This is the default grilling mode for RFC refactor work.

## When To Use

- Changing package boundaries for `@navfolio/core`, official plugins, shared
  types, utilities, themes, or scaffolding.
- Writing or revising an RFC, migration plan, or package proposal.
- Resolving design differences between the current Astro theme and the planned
  plugin ecosystem.
- Comparing Navfolio decisions with the Quartz reference model.

## Required Evidence

Read the relevant sources before asking the user to decide:

- `.agents/context/issue-68-summary.md`
- `.agents/context/quartz-reference.md`
- `.agents/plans/rfc-refactor.md`
- `.agents/plans/package-boundaries.md`
- affected source files under `src/`
- upstream docs or issues when the decision depends on Astro, MDX, Mermaid,
  search, comments, or another integration boundary

## Method

1. State the decision that needs grilling.
2. List the evidence already found, with file paths or source links.
3. Ask one focused question only after evidence narrows the meaningful options.
4. Capture any new shared language in a context note or plan update.
5. Capture durable architecture decisions in an RFC note, package proposal, or
   checklist update.

## Navfolio Documentation Duties

- Update `.agents/context/` when a term, package role, or external reference
  becomes part of the shared vocabulary.
- Update `.agents/plans/` when a decision changes package sequencing or
  ownership.
- Update `.agents/templates/` only when future RFC tasks need a repeated shape.

## Output

End with:

- evidence consulted
- decisions made
- documents updated
- implementation or verification next step
