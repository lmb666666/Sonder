# Skill: Grill Me

Use this skill when a task needs sharper alignment before implementation.

## When To Use

- A GitHub issue or user request leaves package boundaries unclear.
- The change affects public APIs, plugin contracts, routing, content loading, or
  Astro integration behavior.
- The implementation plan has multiple reasonable paths and choosing the wrong
  one would create migration churn.
- The user explicitly asks to be grilled, stress-tested, or challenged.

## Method

1. Inspect the repository first if the answer is discoverable from code, plans,
   or existing context.
2. Ask one focused question at a time only when the answer changes the design.
3. Prefer concrete options over open-ended prompts.
4. Resolve dependencies between decisions before moving to implementation.
5. Stop when the remaining uncertainty is low enough to make a reversible
   engineering move.

## Navfolio Question Areas

- Is this behavior core, theme, official plugin, or community plugin territory?
- Does the change affect Astro content collections, Markdown/MDX rendering, or
  frontmatter contracts?
- Is the target consumer an app author, a plugin author, or a theme author?
- What migration path protects existing blog users?
- Which test or build command proves the decision works?

## Output

End with a short decision summary:

- decisions made
- assumptions still open
- files or plans to update
- verification command to run next
