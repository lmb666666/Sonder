# Package Extraction Workflow

Use this workflow when moving one capability out of the current application.

## Steps

1. Inventory source files and imports.
2. Classify files as contract, runtime, feature behavior, or theme surface.
3. Create or update the target package proposal.
4. Extract type-only contracts first.
5. Add a compatibility adapter in the existing app.
6. Move runtime code behind the adapter.
7. Move tests or add smoke checks.
8. Update docs and migration notes.

## Review Questions

- Can the package be installed without the default theme?
- Can the default theme consume the package without circular imports?
- Does the package expose Astro Integration semantics?
- Does the package have a clear release and compatibility policy?
- Is there a user migration story from the current folder structure?
