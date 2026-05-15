# Bella Care Tracker Redeployment Runbook

Last updated: 2026-05-15.

This runbook covers two cases:

- App-only redeploy to the existing Supabase production database.
- Full rebuild into a fresh Supabase project, including migrations and the real imported history.

Do not run `supabase/seed/002_demo.sql` in production. That file is fake/demo data only.

## Current Production

| Service                  | Value                                            |
| ------------------------ | ------------------------------------------------ |
| Vercel project           | `bella-care-tracker`                             |
| Production URL           | `https://bella-care-tracker.vercel.app`          |
| Supabase project ref     | `rvycamtxmxrggcyyrvpq`                           |
| Supabase URL             | `https://rvycamtxmxrggcyyrvpq.supabase.co`       |
| Supabase publishable key | `sb_publishable_7CcsYOcAPBacpPyVgk_BVg_xA6jluWP` |
| Storage bucket           | `bella-private-uploads`                          |
| Database pooler host     | `aws-1-us-east-1.pooler.supabase.com`            |
| Database pooler port     | `6543`                                           |
| Database pooler user     | `postgres.rvycamtxmxrggcyyrvpq`                  |

Production data currently loaded:

| Table area        | Count |
| ----------------- | ----: |
| `sources`         |   116 |
| `events`          |    69 |
| `entries`         |    13 |
| `attachments`     |     0 |
| fake/demo sources |     0 |
| fake/demo entries |     0 |

The 13 `entries` are the narrative pain logs split into individual rows. The `attachments` count is still `0` because the extracted record sources were imported as source metadata/events, not uploaded as storage-backed files.

## Private Values

These values are needed but should stay out of tracked markdown and git history, even for this personal project:

- `OPENAI_API_KEY`
- Supabase database password
- Supabase service role key, for local development/admin scripts only
- Bella and Armen login passwords

Where they currently live:

- Vercel Production has `OPENAI_API_KEY` set as a sensitive env var.
- Local `.env.local` has `OPENAI_API_KEY` for local runs.
- Supabase database password is needed only for direct `psql`/migration commands.

If you want a personal plaintext note, put it in an ignored file such as `data/bootstrap/redeployment.private.md`.

## Required Tools

From the repo app directory:

```bash
cd /Users/armenag/code/bella/app
npm install
```

Install local database tools if needed:

```bash
brew install postgresql@15
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
```

Use the Vercel CLI through `npx`. On this machine, use a temp npm cache to avoid local npm cache permission errors:

```bash
export NPM_CONFIG_CACHE=/tmp/bella-npm-cache
```

## App-Only Redeploy

Use this when the production Supabase database already exists and only the web app needs a fresh deployment.

1. Check the working tree.

   ```bash
   git status --short
   ```

2. Run the local verification gate.

   ```bash
   npm run verify
   ```

3. Confirm Vercel env vars exist.

   ```bash
   npm_config_cache=/tmp/bella-npm-cache npx --yes vercel@54.0.0 env ls
   ```

   Required production vars:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://rvycamtxmxrggcyyrvpq.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_7CcsYOcAPBacpPyVgk_BVg_xA6jluWP
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_7CcsYOcAPBacpPyVgk_BVg_xA6jluWP
   SUPABASE_STORAGE_BUCKET=bella-private-uploads
   SIGNED_URL_TTL_SECONDS=300
   NEXT_PUBLIC_MOBILE_INSTALL_PROMPT_ENABLED=true
   NEXT_PUBLIC_OFFLINE_CAPTURE_ENABLED=false
   NEXT_PUBLIC_WEB_PUSH_ENABLED=false
   OPENAI_API_KEY=<sensitive; set in Vercel>
   ```

4. If a production env var needs to be replaced, remove then add it.

   ```bash
   npm_config_cache=/tmp/bella-npm-cache npx --yes vercel@54.0.0 env rm OPENAI_API_KEY production
   npm_config_cache=/tmp/bella-npm-cache npx --yes vercel@54.0.0 env add OPENAI_API_KEY production
   ```

5. Deploy production.

   ```bash
   npm_config_cache=/tmp/bella-npm-cache npx --yes vercel@54.0.0 --prod
   ```

6. Confirm the alias points at the new deployment.

   ```bash
   npm_config_cache=/tmp/bella-npm-cache npx --yes vercel@54.0.0 inspect https://bella-care-tracker.vercel.app
   ```

## Full Supabase Rebuild

Use this only if creating a fresh Supabase database or restoring from scratch.

1. Create or choose a Supabase project.

   Required online values:
   - Project URL.
   - Publishable key.
   - Database password.
   - Shared pooler connection string. Prefer the IPv4-compatible shared pooler, not the direct IPv6-only DB host.

   Current pooler format:

   ```bash
   postgresql://postgres.rvycamtxmxrggcyyrvpq:<SUPABASE_DB_PASSWORD>@aws-1-us-east-1.pooler.supabase.com:6543/postgres
   ```

2. Export the database URL locally.

   ```bash
   export SUPABASE_POOLER_DB_URL='postgresql://postgres.rvycamtxmxrggcyyrvpq:<SUPABASE_DB_PASSWORD>@aws-1-us-east-1.pooler.supabase.com:6543/postgres'
   export PSQL=/opt/homebrew/opt/postgresql@15/bin/psql
   ```

3. Push migrations.

   ```bash
   npx supabase db push --db-url "$SUPABASE_POOLER_DB_URL"
   ```

4. Seed production-safe reference data.

   ```bash
   "$PSQL" -v ON_ERROR_STOP=1 "$SUPABASE_POOLER_DB_URL" -f supabase/seed/001_reference.sql
   ```

5. Create the two Auth users in Supabase.

   In Supabase Dashboard, create:
   - `bella.ag@live.com`
   - `armen.ag@live.com`

   Then make sure their profile rows share the same `family_id`, with Bella as `primary` and Armen as `caregiver`.

   Template SQL after both Auth users exist:

   ```sql
   with target_family as (
     select 'dc208494-7935-4b17-9a24-9a3bab669a10'::uuid as family_id
   )
   update public.profiles p
   set
     family_id = target_family.family_id,
     display_name = case
       when p.email = 'bella.ag@live.com' then 'Bella'
       when p.email = 'armen.ag@live.com' then 'Armen'
       else p.display_name
     end,
     role_id = case
       when p.email = 'bella.ag@live.com' then (select id from public.roles where slug = 'primary')
       when p.email = 'armen.ag@live.com' then (select id from public.roles where slug = 'caregiver')
       else p.role_id
     end
   from target_family
   where p.email in ('bella.ag@live.com', 'armen.ag@live.com');
   ```

6. Load the curated current-record history.

   The reviewed source files are ignored by git because they contain private medical history. Preserve or restore this local folder before rebuilding:

   ```bash
   data/bootstrap/
   ```

   Important files:

   ```bash
   data/bootstrap/events.final.review.jsonl
   data/bootstrap/entries.review.jsonl
   data/bootstrap/source_manifest.jsonl
   data/bootstrap/attachments.review.jsonl
   data/bootstrap/prod_current_records_import.sql
   data/bootstrap/prod_narrative_entries_import.sql
   ```

   Regenerate and verify the current-record import SQL:

   ```bash
   node scripts/historical-import/verify-import.mjs \
     --events data/bootstrap/events.final.review.jsonl

   node scripts/historical-import/apply-reviewed-import.mjs \
     --profile-email bella.ag@live.com \
     --events data/bootstrap/events.final.review.jsonl \
     --output data/bootstrap/prod_current_records_import.sql
   ```

   Apply the current-record import:

   ```bash
   "$PSQL" -v ON_ERROR_STOP=1 "$SUPABASE_POOLER_DB_URL" \
     -f data/bootstrap/prod_current_records_import.sql
   ```

7. Load the split narrative pain-log entries.

   This import was manually curated from:

   ```bash
   data/bootstrap/entries.review.jsonl
   ../records_md/generated/user_provided/Pain_Log_User_Provided.md
   ../records_md/generated/user_provided/Unknown_Date_Scar_Injection_Response_Log.md
   ```

   Apply it:

   ```bash
   "$PSQL" -v ON_ERROR_STOP=1 "$SUPABASE_POOLER_DB_URL" \
     -f data/bootstrap/prod_narrative_entries_import.sql
   ```

8. Set Vercel production env vars.

   ```bash
   npm_config_cache=/tmp/bella-npm-cache npx --yes vercel@54.0.0 env add NEXT_PUBLIC_SUPABASE_URL production
   npm_config_cache=/tmp/bella-npm-cache npx --yes vercel@54.0.0 env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
   npm_config_cache=/tmp/bella-npm-cache npx --yes vercel@54.0.0 env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
   npm_config_cache=/tmp/bella-npm-cache npx --yes vercel@54.0.0 env add SUPABASE_STORAGE_BUCKET production
   npm_config_cache=/tmp/bella-npm-cache npx --yes vercel@54.0.0 env add SIGNED_URL_TTL_SECONDS production
   npm_config_cache=/tmp/bella-npm-cache npx --yes vercel@54.0.0 env add NEXT_PUBLIC_MOBILE_INSTALL_PROMPT_ENABLED production
   npm_config_cache=/tmp/bella-npm-cache npx --yes vercel@54.0.0 env add NEXT_PUBLIC_OFFLINE_CAPTURE_ENABLED production
   npm_config_cache=/tmp/bella-npm-cache npx --yes vercel@54.0.0 env add NEXT_PUBLIC_WEB_PUSH_ENABLED production
   npm_config_cache=/tmp/bella-npm-cache npx --yes vercel@54.0.0 env add OPENAI_API_KEY production
   ```

9. Deploy.

   ```bash
   npm_config_cache=/tmp/bella-npm-cache npx --yes vercel@54.0.0 --prod
   ```

## Production Verification

Run count checks:

```bash
"$PSQL" -v ON_ERROR_STOP=1 "$SUPABASE_POOLER_DB_URL" -P pager=off -c "
select 'sources_total' metric, count(*)::text value
from public.sources
where deleted_at is null
union all
select 'events_total', count(*)::text
from public.events
where deleted_at is null
union all
select 'entries_total', count(*)::text
from public.entries
where deleted_at is null
union all
select 'attachments_total', count(*)::text
from public.attachments
where deleted_at is null
union all
select 'fake_or_demo_sources', count(*)::text
from public.sources
where deleted_at is null
  and (title ilike '%demo%' or title ilike '%fake%' or title ilike '%placeholder%')
union all
select 'fake_or_demo_entries', count(*)::text
from public.entries
where deleted_at is null
  and (title ilike '%demo%' or title ilike '%fake%' or title ilike '%placeholder%');
"
```

Expected counts for the current production import:

```text
sources_total        116
events_total         69
entries_total        13
attachments_total    0
fake_or_demo_sources 0
fake_or_demo_entries 0
```

Run narrative-entry relationship checks:

```bash
"$PSQL" -v ON_ERROR_STOP=1 "$SUPABASE_POOLER_DB_URL" -P pager=off -c "
with narrative as (
  select id, type, occurred_at
  from public.entries
  where title like 'Pain log %'
     or title = 'Unknown-date post-scar-injection response log'
)
select 'narrative_entries' as metric, count(*)::text as value from narrative
union all
select 'date_range', min(occurred_at)::date || '..' || max(occurred_at)::date from narrative
union all
select 'by_type', string_agg(type || '=' || c, ', ' order by type)
from (select type, count(*) c from narrative group by type) t
union all
select 'relations',
  'regions=' ||
    (select count(*) from public.entry_regions where entry_id in (select id from narrative) and deleted_at is null) ||
  ', symptoms=' ||
    (select count(*) from public.entry_symptoms where entry_id in (select id from narrative) and deleted_at is null) ||
  ', triggers=' ||
    (select count(*) from public.entry_triggers where entry_id in (select id from narrative) and deleted_at is null);
"
```

Expected:

```text
narrative_entries 13
date_range        2025-07-07..2026-05-08
by_type           baseline=1, flare=6, freeform=1, procedure_related=3, recovery=1, vasomotor=1
relations         regions=40, symptoms=33, triggers=23
```

Smoke test the deployed app:

1. Open `https://bella-care-tracker.vercel.app`.
2. Sign in as `bella.ag@live.com`.
3. Confirm `/dashboard` loads.
4. Check `/timeline`, `/sources`, and `/pain-book`.
5. Confirm the split narrative entries appear in the pain/log surfaces.

## Notes

- Replacing Vercel env vars requires a fresh production deploy before server code sees the new values.
- Sensitive Vercel env vars cannot be read back later. Store private values outside the repo.
- The local `.env.local` may point at local Supabase. Do not assume it contains production Supabase values.
- The real medical import artifacts under `data/bootstrap/*.jsonl` and `data/bootstrap/*.sql` are ignored by git. Back them up separately if you need rebuilds from a clean machine.
- The direct Supabase DB host may not work from IPv4-only networks. Use the shared pooler connection string.
