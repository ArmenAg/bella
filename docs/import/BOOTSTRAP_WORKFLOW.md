# Bootstrap And Import Workflow

This app treats historical medical records as reviewable source material first, then applies only accepted structured rows.

## Goals

- Preserve the original file path and hash for every imported source.
- Avoid fake certainty: extracted events are review candidates until accepted.
- Make the process deterministic and safe to rerun.
- Keep generated bootstrap artifacts out of git because they may contain health information.

## One-Time Bootstrap From Current Records

Current records live outside the app in:

- `../records_md`
- `../reports_md`
- `../Fw_ Medical Files`
- `../HealthSummary_May_07_2026/1 of 1 - My Health Summary.PDF`
- Top-level workspace PDFs and other importable files

Prepare the local bootstrap files:

```bash
npm run bootstrap:prepare
```

This creates ignored files under `data/bootstrap/`:

- `source_manifest.jsonl`: source library rows, accepted by default.
- `events.review.jsonl`: timeline/procedure/test event candidates.
- `entries.review.jsonl`: pain/log files that require manual splitting.
- `attachments.review.jsonl`: binary files that need storage upload before final attachment records.

The importer accepts HealthSummary encounter metadata as timeline anchors because the date, department, provider, and encounter type come from structured source metadata. Heuristic candidates from pasted notes, PDFs, and narrative logs default to `needs_review`.

To regenerate the curated reusable seed for the current records:

```bash
npm run bootstrap:seed-sql
```

This runs prepare, applies the manual finalization rules in `scripts/historical-import/finalize-current-records.mjs`, verifies the final event file, and writes `supabase/seed/005_current_records_bootstrap.sql`. See `docs/import/CURRENT_RECORDS_SEED_AUDIT.md` for the current coverage and source-only decisions.

## Review Step

Open `data/bootstrap/events.review.jsonl` and change rows only when the source supports the structure:

- `review_status: "accepted"` imports the row.
- `review_status: "needs_review"` keeps the row out of SQL.
- `review_status: "rejected"` documents that the candidate should not be imported.

Fields to review carefully:

- `type`: must be one of `consult`, `imaging`, `test_lab`, `procedure`, or `procedure_test`.
- `title`: should be clinician-readable.
- `occurred_at`: stored as UTC. Date-only records use noon UTC so they sort predictably.
- Procedure impact fields: `diagnostic_question`, `baseline_before`, `immediate_effect`, later effect checkpoints, and `answered_question`.

Run static verification after edits:

```bash
npm run bootstrap:verify
```

## Generate And Apply SQL

Generate deterministic SQL:

```bash
npm run bootstrap:apply
```

That writes `data/bootstrap/bootstrap_import.sql`. Review it, then apply to a running local Supabase stack:

```bash
npm run bootstrap:apply:local
```

By default, rows import into the local demo profile `bella.demo@example.test`. To generate SQL for another profile:

```bash
node scripts/historical-import/apply-reviewed-import.mjs --profile-email your@email.test
```

## Importing New Files Later

Drop files into `data/import-inbox/`, then run:

```bash
npm run import:inbox
```

This writes inbox-specific review artifacts:

- `inbox_source_manifest.jsonl`
- `inbox_events.review.jsonl`
- `inbox_entries.review.jsonl`
- `inbox_attachments.review.jsonl`

Review them the same way, then generate SQL with explicit paths:

```bash
node scripts/historical-import/apply-reviewed-import.mjs \
  --manifest data/bootstrap/inbox_source_manifest.jsonl \
  --events data/bootstrap/inbox_events.review.jsonl \
  --output data/bootstrap/inbox_import.sql
```

## Current Limitations

- Attachments are identified but not uploaded to Supabase Storage by the script. Upload first, then create final attachment records from the reviewed candidates.
- Narrative pain logs are not auto-split into structured pain entries yet; the candidate file points to sources that need manual extraction.
- MyChart/HealthChart connectors are intentionally out of scope for this bootstrap. Portal exports should be downloaded manually and placed in the import inbox.
