# Skill: Super Power Skill

Use this skill as a lightweight router for choosing the right Navfolio agent
workflow before meaningful engineering work starts.

## Purpose

Navfolio's RFC refactor is larger than one code change. This skill keeps agents
from treating every request as a direct edit by choosing the right local skill,
workflow, and verification checkpoint first.

## Routing Rules

- Use `grill-with-docs` for architecture decisions that need issue, plan, or
  source evidence.
- Use `grill-me` for fast design stress-testing when external documents are not
  the main constraint.
- Use `architecture-rfc` when the change reshapes long-term package boundaries.
- Use `package-extraction` when moving code toward a core, plugin, utility,
  theme, or scaffold package.
- Use `plugin-contract-review` before accepting a plugin API as stable.

## Working Loop

1. Identify the smallest meaningful goal.
2. Pick the skill and workflow that match that goal.
3. Make the plan concrete enough to verify.
4. Change one boundary at a time.
5. Run the narrowest useful verification.
6. Review the diff for accidental coupling before committing.

## Checkpoints

Pause and re-evaluate when:

- core starts importing theme UI
- plugin behavior requires app-specific source paths
- shared types depend on feature implementation details
- documentation says one package owns behavior but code places it elsewhere
- verification only proves formatting, not runtime or content behavior

## Output

End with:

- selected skill or workflow
- reason for the selection
- verification performed
- follow-up document or code boundary to revisit
