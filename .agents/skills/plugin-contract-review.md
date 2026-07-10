# Skill: Plugin Contract Review

Use this skill when editing `NavfolioPlugin`, config schemas, lifecycle hooks,
or Astro Integration glue.

## Review Focus

- API minimalism
- Astro Integration compatibility
- type stability
- async lifecycle behavior
- content collection extension points
- theme independence

## Questions

- Is the hook already covered by Astro?
- Does the hook need access to config, file system, or build context?
- Can plugin authors test the contract outside the full app?
- Can official plugins share the same contract without special cases?
