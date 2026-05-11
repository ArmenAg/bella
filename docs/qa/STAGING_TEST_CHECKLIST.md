# Staging Test Checklist

Run this before tagging a staging release. The goal is "no surprises with real
data" — not "every line covered." Mark each item before pushing.

## Automated gates

- [ ] `npm run verify` is green (typecheck + lint + format + test + build).
- [ ] `npm run db:verify:local-postgres` is green (runs every migration from
      scratch on Postgres 15, executes the RLS verifier, asserts no anon
      privileges leaked).
- [ ] CI's `db-verify` job has run at least once on the candidate commit
      (label `db-verify` on the PR, or merge to `main`).
- [ ] `npm run test:e2e` (Tier-1 smokes, no Supabase) is green.
- [ ] `BELLA_E2E_SUPABASE=1 npm run test:e2e` (Tier-2 smokes against local
      Supabase) is green or the gap is documented in the PR.

## Manual spot-checks

Tier-2 smokes don't cover everything yet. Spot-check the workflows that touch
uploads, third-party services, or real data:

### Capture

- [ ] **Pain Book**: create an entry with body region, symptom, trigger, and
      one attachment. Confirm it appears in the list and in
      `/timeline?type=pain_entry`.
- [ ] **Log Book**: create a freeform entry. Confirm it appears in
      `/timeline?type=log_entry`.
- [ ] **Flare Mode**: start a flare → add a checkpoint at +30m and +60m →
      end the flare. Confirm summary shows recovery duration and that the
      flare appears in `/timeline?flare_only=true`.
- [ ] **Vasomotor**: create a left/right photo comparison with two temps and
      confirm the delta renders.

### Workflows

- [ ] **Timeline filters**: date, type, body region, symptom, trigger,
      diagnostic branch, flare-only, media-only all change the list.
- [ ] **Diagnostic Tree**: open one branch's edit page, confirm evidence
      links can be added and the limitation note about pre-existing links
      is visible.
- [ ] **Decisions**: create an open decision with two options.
- [ ] **Schedule**: create one upcoming appointment + one open task linked
      to it.
- [ ] **Medications**: add a medication, then a response with all four pain
      scores (0/30/60/120 min).
- [ ] **Procedures**: add a procedure event and fill the impact-over-time
      sections (baseline → 1 month).
- [ ] **Source library**: create a source, attach a file, link to one
      diagnosis and one decision.

### Agent + Import

- [ ] **Agent**: open `/agent`. Create a thread. Send a message. Confirm
      tool calls render in the audit panel and any draft cards link to
      `/import`. Confirm the rail shows drafts only for this thread (the
      `agent_thread_id` filter is live — see
      `ai-agent-thread-scoping.test.ts`).
- [ ] **Import review**: from `/import`, edit one draft's payload, then
      commit one synthetic draft. Confirm the resulting record appears in
      its primary surface (e.g. Pain Book). The agent never commits — only
      humans do.

### Apple Health

- [ ] **Synthetic import**: upload `tests/fixtures/apple-health/export.zip`
      via `/apple-health`. Confirm import shows `completed`, with the
      expected metric counts (3 quantity / 1 sleep / 1 workout).
- [ ] **Idempotency**: re-upload the same fixture. Confirm
      `imported_sample_count` is 0 and `duplicate_sample_count` matches the
      first run. Confirm daily summaries are unchanged.
- [ ] **Raw zip cleanup**: confirm the source attachment row is
      `soft-deleted` after the import completes (does not appear in any
      attachment-listing surface).

### Mobile PWA / Bella iPhone

- [ ] **Install + relaunch**: on Bella's iPhone, remove any old Home Screen
      icon, open the staging URL in Safari, sign in, Add to Home Screen as
      `Bella`, launch from the icon, force close, and relaunch. Confirm
      standalone mode, auth persistence, safe areas, and no install prompt in
      standalone.
- [ ] **Camera/upload**: from Pain Book or Vasomotor, use the camera capture
      button and upload one synthetic photo. Confirm progress, success, and a
      readable failure if airplane mode is enabled mid-upload.
- [ ] **Apple Health upload**: from `/apple-health`, follow the in-app manual
      export instructions, pick a test `export.zip`, confirm upload progress,
      import progress, success summary, and dedupe on repeat upload.
- [ ] **Stale update**: with the app open from the Home Screen, deploy a build
      with an updated `public/sw.js` cache version. Confirm the app shows the
      non-PHI "Update available" prompt and reloads cleanly when tapped.
- [ ] **Rollback drill**: in staging only, deploy `public/sw.js` with
      `ROLLBACK_UNREGISTER = true`. Confirm `bella-*` caches clear, the worker
      unregisters, and a later normal deploy registers a fresh worker.

### Export

- [ ] **Clinician packet**: generate a clinician markdown packet for the
      last 30 days. Confirm sections render and the included-attachment
      count matches what you'd expect from the synthetic data.
- [ ] **Bulk export manifest**: trigger a bulk export. Confirm the
      Apple Health raw zips do **not** appear in the manifest's
      `uploaded_file_manifest`, and the limitations array is present.

## Auth / role gates

- [ ] Log in as a `viewer` profile. Confirm:
  - No "New entry" / "New decision" / "Commit" buttons.
  - `/import` shows the read-only notice.
  - Manual attempts to call write actions return `FORBIDDEN`.

## Data hygiene

- [ ] `tests/fixtures/` only contains synthetic data (`grep -ri bella tests/`
      returns no real names, MRNs, addresses, or providers).
- [ ] No `.env` or credential files staged. Run
      `git status` and inspect.

## How to run the automated half

```sh
# Fast gates (CI parity, no Supabase)
npm run verify

# Slow gates with helpful skip notices when prereqs are missing
npm run verify:full

# Tier-2 against seeded local Supabase + faked AI
npx supabase start && npx supabase db reset && npm run supabase:seed
BELLA_E2E_SUPABASE=1 BELLA_E2E_AGENT_FAKE=1 \
  BELLA_E2E_PRIMARY_PASSWORD=local-demo-password \
  npm run test:e2e
```

## Deferred (documented, not blocking)

Tracked in `docs/qa/TESTING_STRATEGY.md`:

- **Full Supabase + ssr-cookie integration test in CI.** Tier-2 smokes
  require Docker + `npx supabase` containers, which we don't run in every
  PR. They run locally and pre-staging only.
- **Photo-upload smokes for Vasomotor + Pain Book attachments.** Skipped
  to keep fixture sizes small.
