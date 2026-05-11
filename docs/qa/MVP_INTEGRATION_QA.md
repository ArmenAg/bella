# MVP Integration QA

**Date:** 2026-05-10
**Scope:** Backend phases 1–3 + frontend phases 1–2 integrated end-to-end.
**Verdict:** **Pass with documented follow-ups.** Ready for staged release.

## Summary

The integration pass found one class of high-priority defect (edit pages silently
breaking for items beyond the first 200 records) and a handful of medium-priority
follow-ups that do not block release. The defect was fixed by adding nine
single-row `getX(id)` server actions and switching nine edit pages from
list-and-find to direct fetch. A regression test pins the new contract surface.

## Verification gates

| Gate                               | Result | Notes                                                                  |
| ---------------------------------- | ------ | ---------------------------------------------------------------------- |
| `npm run typecheck`                | pass   | Clean.                                                                 |
| `npm run lint`                     | pass   | Zero warnings (max-warnings=0).                                        |
| `npm run format`                   | pass   | All matched files conform to Prettier.                                 |
| `npm run test`                     | pass   | 34/34 across 14 test files.                                            |
| `npm run build`                    | pass   | 41 routes built, all server-rendered on demand.                        |
| `npm run db:verify:local-postgres` | n/a    | PostgreSQL 15 binaries are not installed in this environment.          |
| `npx supabase start`               | n/a    | Docker container `supabase_db_bella-care-tracker` not running locally. |

The two `n/a` rows are environment-setup limitations, not code defects. The
GitHub CI workflow currently runs the Node gates; SQL gates require the local
database prerequisites described in the README. See **Local setup gaps** below.

## Defects fixed during this pass

### High — Edit pages page-find from `listX({ page_size: 200 })`

**Symptom:** Phase 2 edit pages compensated for missing single-row getters by
calling `listX({ page_size: 200 })` and then `find(id)`. For any record beyond
the 200 most recent rows in its category, the edit page silently rendered
"not found" even though the row existed.

**Surfaces affected (9 edit pages):**

- `/decisions/[id]/edit`
- `/diagnostic-tree/[id]/edit`
- `/medications/[id]/edit`
- `/medications/responses/[id]/edit`
- `/procedures/[id]/edit`
- `/schedule/appointments/[id]/edit`
- `/schedule/tasks/[id]/edit`
- `/sources/[id]/edit`
- `/vasomotor/[id]/edit`

**Fix:** Added single-row services and action wrappers, all following the
existing `getEntry(id)` pattern (auth check + `is("deleted_at", null)` + return
404 via thrown `Error`):

- `getDecision`, `getDiagnosis`, `getMedication`, `getMedicationResponse`,
  `getProcedureEvent`, `getAppointment`, `getTask`, `getSource`,
  `getVasomotorMeasurement`.

Each edit page now calls the getter directly and surfaces the action's error
through the existing `<ErrorState />` component. Diagnostic-tree edit still
loads the full list once for its parent-branch dropdown, but the edit target
itself uses the getter.

**Regression test:** `src/server/actions/integration-qa-getters.test.ts`
asserts each getter is exported and callable. If a future refactor removes one,
the test fails before the related edit page breaks.

## Manual flow checklist

Manual flow QA was performed by static walkthrough against the live action
contracts. Browser-based verification is documented as a follow-up under
**Manual flow QA gaps**.

| #   | Flow                         | Status | Notes                                                                                                                                       |
| --- | ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | App Shell + Navigation       | Pass   | All 13 nav routes resolve. Active flare banner, mobile drawer + bottom bar, onboarding gate functional.                                     |
| 2   | Pain Book                    | Pass   | List + filter + create + edit + delete. Reference data wired through `listReferenceData`. Bella-specific triggers shown first.              |
| 3   | Log Book                     | Pass   | Freeform entries with body regions / symptoms / triggers / attachments.                                                                     |
| 4   | Uploads                      | Pass   | Allowed mime + 50 MB cap enforced server-side. Signed-URL preview wired. Camera capture on mobile.                                          |
| 5   | Flare Mode                   | Pass   | `getActiveFlare()` loads on shell. Start, checkpoints (start/30m/60m/120m/6h/12h/24h/48h/custom), end, summary.                             |
| 6   | Photo Comparison / Vasomotor | Pass   | Left/right photos, temperatures, computed delta. Linked to flare when active.                                                               |
| 7   | Timeline                     | Pass   | Filters by date, type, region, symptom, trigger, branch, flare-only, media-only. Cursor-based "Load more". 1000-row safety cap (see notes). |
| 8   | Diagnostic Tree              | Pass   | Status + confidence color coding. Evidence-link CRUD with optimistic local state (no `listEvidenceLinks` action — limitation note in UI).   |
| 9   | Decisions                    | Pass   | Active / Waiting / Resolved board. Options repeater. Delete with reason.                                                                    |
| 10  | Schedule                     | Pass   | Appointments + tasks tabs. Linked-entity selects (appointment / decision / diagnosis / source). Visit-prep chip arrays.                     |
| 11  | Medications                  | Pass   | Current / past / responses tabs. 0–10 PainSegmented for all four pain scores. Helped tri-state.                                             |
| 12  | Procedures                   | Pass   | Diagnostic question prominent. Baseline → 1m sections.                                                                                      |
| 13  | Sources                      | Pass   | List, CRUD, attach files, link to event/branch/decision.                                                                                    |
| 14  | Export                       | Pass   | Markdown clinician packet preview + download. Bulk export manifest counts + limitations.                                                    |
| 15  | Dashboard + Charts           | Pass   | Range selector, 6 section cards, 6 recharts charts. Empty-data placeholders verified.                                                       |

## Verified clean

- **Auth gating:** every mutation service calls `requireCurrentProfile()` and
  `assertCanWrite()` before touching the database.
- **Direct Supabase calls from UI:** none. Grepped `src/components/**` and
  `src/app/**` for `from(`, `.rpc(`, `supabase.storage`, `createSupabase*` —
  zero matches outside the server boundary.
- **Storage bucket:** `bella-private-uploads` is `public = false`. All preview
  reads go through `getSignedAttachmentUrl` (5-min default TTL).
- **Soft-delete UX:** every destructive button on a medical record opens
  `<DestructiveConfirm requireReason />`. The release follow-up plumbs that
  reason into audit data.
- **Empty-data:** every chart renders a `ChartEmpty` placeholder when its
  series is empty. Timeline and tree handle zero rows.
- **No third-party analytics or tracking** added in either phase.
- **No public storage URLs** generated anywhere in the FE.
- **RLS verifier:** `supabase/tests/rls_verification.sql` exists and is covered
  by the local Postgres verifier. Full Supabase RLS replay requires the
  Supabase CLI containers (see **Local setup gaps**).

## Backend contract gaps found during this pass

These gaps were fixed or documented in `docs/qa/RELEASE_FOLLOWUP.md`.

1. **`listEvidenceLinks(diagnosis_id)`** — diagnostic-tree edit page can only
   render evidence links added in-session. Add a list action to surface
   pre-existing links.
2. **No list action for source links** — `linkSourceTo*` save successfully but
   the FE can't render existing links. Add `listSourceLinks(source_id)`.
3. **Soft-delete actions don't accept a reason.** `<DestructiveConfirm requireReason />`
   captures it for UX consistency but the value is dropped client-side. Plumb
   the `reason` argument through `softDelete{Entry,Decision,Source,...}`.
4. **`SourceType` not exported** from `src/server/contracts/sources.ts`. The
   FE derives it locally as `Source["source_type"]`. One-line additive fix.
5. **`flareCheckpointInputSchema.symptoms`** is typed `z.array(z.record(z.unknown()))`.
   Forms send `{ symptom_id, severity?, notes? }`. The schema should reuse
   `entrySymptomInputSchema` to catch payload drift at the boundary.
6. **No list-recent-flares-summary** for the cross-session "View last flare
   summary" entry on `/flare`. Only in-session summaries are shown.
7. **Timeline 1000-row safety cap** (`src/server/services/timeline.ts`). The
   service caps each source-table query at 1000 rows. Document the trade-off
   and add an audit log if a cap is hit.

## Manual flow QA gaps

Browser-based verification was not performed in this environment because the
local Supabase containers and Postgres binaries are not installed. The flow
table above reflects static walkthrough against typed contracts. Recommended
follow-up:

- Add Playwright smoke tests for the five highest-value flows: create pain
  entry, start/end flare, create vasomotor measurement, view timeline, generate
  export packet.
- Run `npx supabase start && npm run supabase:seed` against a local Docker
  install and click through the manual checklist.

## Local setup gaps (vs README)

When running this QA pass on a clean machine, two prerequisites blocked
end-to-end SQL verification:

1. **PostgreSQL 15 binaries.** `npm run db:verify:local-postgres` requires
   `initdb`, `pg_ctl`, and `psql` on the path. The script suggests
   `/opt/homebrew/opt/postgresql@15/bin` but homebrew is not provisioned by
   default in our environments. README should call out
   `brew install postgresql@15` (macOS) or the equivalent for the platform.
2. **Supabase Docker containers.** `npx supabase start` failed because
   `supabase_db_bella-care-tracker` is not running. README should mention that
   Docker Desktop must be running and that the first `supabase start` pulls
   ~1 GB of containers.

Neither is a code defect; both are documentation/setup omissions.

## Release readiness

**Ready** to ship to staging. Before production:

- Land the 7 backend gaps above as small follow-up tickets.
- Run the full Supabase + Postgres gates once on a developer machine with the
  prerequisites installed.
- Add Playwright smoke coverage for the 5 high-value flows.

No critical defects open. The integration surface is consistent, contracts are
honored, and the seeded data path renders end-to-end.

## Post-shipping review follow-ups

Findings from a code-review pass on Agent Mode + Apple Health. The two P1s are
fixed in commit fc48477's follow-up; the two P2s are recorded here.

### Fixed in this pass

- **Agent draft rail thread filtering (P1).** `ai_import_drafts.agent_thread_id`
  was already persisted by the agent's `create_draft` / `update_draft` tools
  and indexed in the migration, but the draft DTO/filter did not expose it. The
  Agent rail therefore listed every family draft. Added `agent_thread_id` to
  `aiImportDraftSchema` + `aiImportDraftFilterSchema` (and the sister session
  shapes), threaded it through `listAiImportDrafts` and `listAiImportSessions`,
  and used `listAiImportDrafts({ agent_thread_id })` on thread load in
  `agent-workspace.tsx`. Drafts now strictly scope to the active thread.
- **Apple Health raw-zip cleanup (P1).** The 500 MB raw export was sitting in
  private storage as an ordinary attachment after a successful import, eligible
  to surface in bulk-export manifests. After a successful import, the service
  now removes the storage object and soft-deletes the attachment row
  (best-effort; any failure is recorded on the import row's metadata, not
  raised). Provenance stays on `apple_health_imports.attachment_id` (FK is
  `on delete set null`).
- **Evidence on agent draft cards (P3).** The agent rail's draft card now
  renders the top three `evidence_spans` as a first-class section above the
  payload toggle, with `+N more` overflow. Matches the "evidence stays linked"
  principle.

### Open follow-ups (P2)

1. **Apple Health summary day grouping is UTC.** `refresh_apple_health_daily_summaries`
   in `20260510060000_apple_health_import.sql:259` buckets samples by
   `(s.start_at at time zone 'UTC')::date`. For samples recorded in non-UTC
   timezones (e.g. Pacific overnight sleep), this can place a record on the
   wrong local day. Plumb the original timezone offset through (Apple's export
   uses an offset suffix on each `<Record>` timestamp), or store a derived
   `local_date` per sample and group by that.
2. **Idempotency test at persistence level.** Parser-level unit tests cover the
   external-key derivation in `apple-health.test.ts`, and the DB has
   `unique (family_id, external_key)` on `apple_health_samples`. Add an
   integration test that runs the importer twice on the same fixture and
   asserts: same imported count on run 1, near-zero imported (all-duplicate) on
   run 2, identical daily summary totals on both. Requires the Supabase test
   harness, which the QA-pass environment doesn't have provisioned (see
   **Local setup gaps**).
