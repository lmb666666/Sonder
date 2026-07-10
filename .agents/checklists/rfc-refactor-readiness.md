# RFC Refactor Readiness Checklist

## Before Code Movement

- [ ] Issue #68 goals are reflected in `.agents/plans/rfc-refactor.md`.
- [ ] Package boundary map is current.
- [ ] Quartz reference model has been considered for collaboration shape.
- [ ] Current imports have been searched.
- [ ] A rollback path exists for the current app.

## Before PR

- [ ] The site still builds.
- [ ] No package imports depend on future unpublished package names without an
      adapter or plan note.
- [ ] Theme code and feature behavior are not mixed in one extraction.
- [ ] Migration notes are updated.
- [ ] Follow-up work is recorded.
