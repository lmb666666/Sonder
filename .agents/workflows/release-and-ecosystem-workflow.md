# Release And Ecosystem Workflow

## Package Release Draft

Before publishing any `@navfolio/*` package, prepare:

- package purpose and non-goals
- public API list
- peer dependencies
- migration impact
- Changesets entry
- compatibility matrix entry
- docs page
- minimal example

## Ecosystem Collaboration

Follow the Quartz-inspired model:

- Core and docs provide the user entry point.
- Official plugins live in focused repositories or packages.
- Community plugins start from a template.
- Compatibility is communicated through package versions and docs, not hidden
  runtime assumptions.
