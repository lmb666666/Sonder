# Skill: Package Extraction

Use this skill when extracting current app behavior into a future package.

## Method

1. Map source files to package roles.
2. Extract types and config schema before runtime.
3. Introduce adapters so current routes keep working.
4. Move behavior behind package-style entry points.
5. Verify imports do not cross forbidden boundaries.

## Output

Each extraction should leave:

- a package boundary note
- a compatibility note
- verification commands
- follow-up tasks for docs and migration
