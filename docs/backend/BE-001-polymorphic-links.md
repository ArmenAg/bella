# BE-001 Polymorphic Link Tradeoffs

`attachment_links` and `evidence_links` use `linked_type` plus `linked_id`
instead of one join table per target entity.

## Why This Is Acceptable For The Foundation

- The frontend needs stable linking contracts across entries, events, decisions,
  diagnoses, sources, measurements, and medication responses.
- The target set will change during early product work.
- Polymorphic rows keep the timeline, source library, and evidence model simple
  while the UI is still stabilizing.

## Tradeoffs

- Postgres cannot enforce foreign keys across a polymorphic target.
- Application services must validate that the target exists before creating
  links.
- Static cleanup is less automatic than per-table junctions.

## Guardrails

- `linked_type` is constrained to known target values.
- Every polymorphic link is scoped by `family_id` and protected by RLS.
- Server services own link creation; frontend code should not write these tables
  directly.
- Before production sharing, re-evaluate whether high-volume link types should
  move to per-type junction tables.
