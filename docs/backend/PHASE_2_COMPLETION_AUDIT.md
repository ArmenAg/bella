# Backend Phase 2 Completion Audit

Objective: extend the completed backend foundation with flare, vasomotor,
timeline, diagnostic/evidence, decisions, schedule, and source-import scaffold
APIs while preserving frontend-owned UI files.

## Success Criteria

- Flare session service/actions support start, checkpoint, update, end, and
  active flare lookup.
- Vasomotor service/actions support create, update, soft delete, list, computed
  deltas, filters, and left/right attachment links.
- Timeline service/action returns normalized `TimelineItem[]` from demo fixture
  domains with filters and pagination.
- Diagnostic node/evidence service/actions support CRUD-like workflows,
  merge/split, and explicit merge/split audit records.
- Diagnostic tree seed/import scaffold is idempotent and uses only
  planning-level branch data from project docs.
- Decisions, appointments, and tasks service/actions support first UI CRUD,
  links, upcoming/open filters, and audit-triggered status changes.
- Contracts, tests, backend docs, migrations, and seeds are updated.
- Verification commands pass locally.

## Prompt-To-Artifact Checklist

| Requirement                                  | Evidence                                                                                                                                                                                                                                               | Status |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| Preserve frontend-owned UI files             | Backend work is in `src/server/**`, `supabase/**`, `scripts/**`, and `docs/backend/**`; only compile/format-safe frontend touch was `src/components/shell/shell-context.ts` replacing JSX in `.ts` with `React.createElement` plus Prettier formatting | Done   |
| BE-006 `startFlare`                          | `src/server/services/flares.ts`, `src/server/actions/flares.ts`                                                                                                                                                                                        | Done   |
| BE-006 `addFlareCheckpoint`                  | `src/server/services/flares.ts`, `src/server/actions/flares.ts`                                                                                                                                                                                        | Done   |
| BE-006 `updateFlare`                         | `src/server/services/flares.ts`, `src/server/actions/flares.ts`                                                                                                                                                                                        | Done   |
| BE-006 `endFlare` computes duration/recovery | `computeRecoveryMinutes` and `endFlare` in `src/server/services/flares.ts`; unit tests in `src/server/services/flares.test.ts`                                                                                                                         | Done   |
| BE-006 `getActiveFlare`                      | `src/server/services/flares.ts`, `src/server/actions/flares.ts`                                                                                                                                                                                        | Done   |
| BE-006 one active flare per user             | Existing unique index `entries_one_active_flare_per_user_idx`; service preflight in `startFlare`                                                                                                                                                       | Done   |
| BE-006 checkpoint types/timestamps           | Existing contract `flareCheckpointTypeSchema`; service stores caller-provided `checkpoint_at`; seed includes checkpoints                                                                                                                               | Done   |
| BE-008 vasomotor create/update/delete/list   | `src/server/services/vasomotor.ts`, `src/server/actions/vasomotor.ts`                                                                                                                                                                                  | Done   |
| BE-008 compute `delta_c` consistently        | Generated DB column plus `computeDeltaC`/normalization fallback; unit tests in `src/server/services/vasomotor.test.ts`                                                                                                                                 | Done   |
| BE-008 date/site/entry filters               | `listVasomotorMeasurements` in `src/server/services/vasomotor.ts`                                                                                                                                                                                      | Done   |
| BE-008 linked left/right attachments         | Existing schema columns plus `replaceVasomotorAttachmentLinks` in `src/server/services/vasomotor.ts`                                                                                                                                                   | Done   |
| BE-009 timeline API                          | `listTimelineItems` and `buildTimelinePage` in `src/server/services/timeline.ts`; action in `src/server/actions/timeline.ts`                                                                                                                           | Done   |
| BE-009 merge requested domains               | Timeline normalizes entries, flare checkpoints, events, appointments, medications/responses, decisions, sources, diagnoses, attachments, and vasomotor measurements                                                                                    | Done   |
| BE-009 filters                               | `timelineFilterSchema` plus `buildTimelinePage` filters date, item type, body region, symptom, trigger, diagnostic branch, flare-only, and media-only                                                                                                  | Done   |
| BE-009 page size default/max                 | Shared `paginationInputSchema`; timeline unit test covers pagination                                                                                                                                                                                   | Done   |
| BE-009 attachment/evidence metadata          | Timeline item metadata includes attachment count/preview; evidence counts derive from evidence tables                                                                                                                                                  | Done   |
| BE-010 diagnosis CRUD/list                   | `src/server/services/diagnoses.ts`, `src/server/actions/diagnoses.ts`                                                                                                                                                                                  | Done   |
| BE-010 evidence link CRUD-like operations    | `createEvidenceLink`, `updateEvidenceLink`, `removeEvidenceLink`                                                                                                                                                                                       | Done   |
| BE-010 evidence directions and link types    | Existing diagnosis contracts cover supports/weakens/neutral/pending and entries/events/attachments/sources/decisions/vasomotor/medication responses/diagnoses                                                                                          | Done   |
| BE-010 merge/split                           | `mergeDiagnosisNodes` and `splitDiagnosisNode` in services/actions                                                                                                                                                                                     | Done   |
| BE-010 merge/split audit records             | Migration function `record_diagnostic_action`; service calls it for merge/split                                                                                                                                                                        | Done   |
| BE-011 diagnostic seed/import script         | `supabase/seed/003_diagnostic_tree.sql`                                                                                                                                                                                                                | Done   |
| BE-011 listed branches                       | Static SQL test checks every branch name from project docs across demo and diagnostic-tree seeds                                                                                                                                                       | Done   |
| BE-011 rerunnable safely                     | Seed uses deterministic UUIDs and `on conflict`; both local verifiers ran seeds twice                                                                                                                                                                  | Done   |
| BE-012/013 decisions API                     | `src/server/services/decisions.ts`, `src/server/actions/decisions.ts`                                                                                                                                                                                  | Done   |
| BE-012/013 decision evidence links           | Additive migration `decision_evidence_links`; `linkDecisionEvidence` service/action                                                                                                                                                                    | Done   |
| BE-012/013 appointment CRUD/list             | `src/server/services/schedule.ts`, `src/server/actions/schedule.ts`                                                                                                                                                                                    | Done   |
| BE-012/013 task CRUD/list/linking            | `src/server/services/schedule.ts`, `src/server/actions/schedule.ts`; task contract supports appointment/decision/diagnosis/source links                                                                                                                | Done   |
| BE-012/013 upcoming/open filters             | `upcoming` appointment filter; `open_only` decision/task filters; unit tests in `phase-two-contracts.test.ts`                                                                                                                                          | Done   |
| Status changes audited                       | Existing audit triggers cover decisions, appointments, tasks, diagnoses, and related domain tables; new decision evidence table has audit trigger                                                                                                      | Done   |
| Handoff with callable functions/examples     | `docs/backend/PHASE_2_HANDOFF.md`                                                                                                                                                                                                                      | Done   |

## Verification Commands

Passing:

- `npm run typecheck`
- `npm run lint`
- `npm run format`
- `npm run test` (25 tests)
- `npm run build`
- `npm run db:verify:local-postgres`
- `npx supabase start`
- `npx supabase db reset`
- `npm run supabase:seed` (run twice to verify idempotency)
- `npm run supabase:verify`

## Notes

- `supabase db query -f` remains avoided for multi-statement seed/verifier files;
  `scripts/run-supabase-sql.sh` executes SQL through `psql` in the running local
  Supabase database container.
- `src/components/shell/shell-context.ts` contained JSX in a `.ts` file from
  concurrent frontend work. The compile-safe fix was required for the requested
  lint/format/type/build gates and did not alter UI behavior.

## Completion Decision

Backend Phase 2 is complete for the primary tickets in `CODEX_NEXT_GOAL.md`.
Secondary APIs for medications/responses, procedure/test events, and full source
library CRUD remain future work because they were explicitly marked
"if time allows" after primary tickets.
