# Navfolio AI Engineering Workspace

This directory is the shared workspace for AI-assisted development on the
Navfolio RFC refactor. It keeps planning material, repeatable workflows, and
task-specific skills close to the repository so future agents can continue the
work without rediscovering the architecture intent.

## Directory Map

- `plans/`: RFC plans, package boundaries, milestones, and migration strategy.
- `workflows/`: Repeatable development workflows for refactor tasks.
- `skills/`: Focused agent skills for architecture, extraction, and review.
- `context/`: External references and project-specific background.
- `checklists/`: Readiness and review checklists for RFC milestones.
- `templates/`: Templates for RFC notes, package proposals, and follow-up tasks.

## Operating Rules

- Keep this directory documentation-first. Do not place generated build output,
  secrets, dependency caches, or large artifacts here.
- Prefer small, dated documents that can be reviewed independently.
- Link decisions back to GitHub issues, PRs, and source files.
- Treat `AGENT.md` at the repository root as the entry point for future agents.
- Keep English identifiers for package names and commands, but use Chinese prose
  when describing Navfolio product intent and RFC decisions.
