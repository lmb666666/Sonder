# Package Boundary Notes

## Boundary Rules

- Core must not import theme components.
- Types must not import Astro runtime values unless they are type-only imports.
- Plugins may depend on `@navfolio/types` and `@navfolio/utils`.
- Plugins should expose an Astro Integration and any user-facing schema helpers.
- Theme may depend on plugin data contracts, but feature plugins should not
  depend on theme internals.
- Shared build tools belong in package templates or workspace scripts, not in
  feature packages.

## Proposed Dependency Direction

```text
create-navfolio
  -> @navfolio/core
  -> @navfolio/types

@navfolio/plugin-*
  -> @navfolio/types
  -> @navfolio/utils
  -> astro

@navfolio/theme-default
  -> @navfolio/types
  -> official plugin data contracts
```

## Anti-patterns To Avoid

- Moving code into a package while keeping imports pointed at `src/*`.
- Letting core know about blog, vibe, projects, or comments by name.
- Letting plugin packages import Astro pages from the default theme.
- Publishing package APIs before migration examples prove them.
- Creating plugin hooks that duplicate Astro lifecycle hooks without a reason.
