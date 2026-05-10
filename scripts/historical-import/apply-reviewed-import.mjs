#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  appRoot,
  argValue,
  parseArgs,
  readJsonl,
  sqlArray,
  sqlLiteral,
} from "./lib.mjs";

const args = parseArgs();
const manifestPath = path.resolve(
  appRoot,
  String(argValue(args, "manifest", "data/bootstrap/source_manifest.jsonl")),
);
const eventsPath = path.resolve(
  appRoot,
  String(argValue(args, "events", "data/bootstrap/events.review.jsonl")),
);
const outputPath = path.resolve(
  appRoot,
  String(argValue(args, "output", "data/bootstrap/bootstrap_import.sql")),
);
const profileEmail = String(
  argValue(args, "profile-email", "bella.demo@example.test"),
);
const shouldApply = args.has("apply");

function isAccepted(row) {
  return row.review_status === "accepted";
}

function sourceValues(row) {
  return [
    sqlLiteral(row.id),
    sqlLiteral(row.title),
    sqlLiteral(row.source_type),
    sqlLiteral(row.source_date),
    sqlLiteral(row.provider),
    sqlLiteral(row.citation ?? row.workspace_path),
    sqlLiteral(row.summary),
    sqlArray(row.tags),
  ].join(", ");
}

function eventValues(row) {
  return [
    sqlLiteral(row.id),
    sqlLiteral(row.type),
    sqlLiteral(row.occurred_at),
    sqlLiteral(row.title),
    sqlLiteral(row.summary),
    sqlLiteral(row.provider),
    sqlLiteral(row.location),
    sqlLiteral(row.source_id),
    sqlLiteral(row.diagnostic_question),
    sqlLiteral(row.baseline_before),
    sqlLiteral(row.immediate_effect),
    sqlLiteral(row.effect_24h),
    sqlLiteral(row.effect_72h),
    sqlLiteral(row.effect_1w),
    sqlLiteral(row.effect_1m),
    sqlLiteral(row.new_symptoms),
    sqlLiteral(row.answered_question),
    sqlLiteral(row.repeat_recommendation),
  ].join(", ");
}

function valuesBlock(rows, toValues) {
  return rows.map((row) => `    (${toValues(row)})`).join(",\n");
}

function buildSql(sources, events) {
  const sourceRows = sources.filter(isAccepted);
  const eventRows = events.filter(isAccepted);
  const sourceSql = sourceRows.length
    ? `
  create temporary table bootstrap_import_sources (
    import_id uuid primary key,
    title text not null,
    source_type text not null,
    source_date date,
    provider text,
    citation text,
    summary text,
    tags text[] not null
  ) on commit drop;

  insert into bootstrap_import_sources (
    import_id,
    title,
    source_type,
    source_date,
    provider,
    citation,
    summary,
    tags
  )
  values
${valuesBlock(sourceRows, sourceValues)};

  insert into public.sources (
    id,
    family_id,
    user_id,
    title,
    source_type,
    source_date,
    provider,
    citation,
    summary,
    tags,
    created_at,
    updated_at
  )
  select
    import_id,
    import_family_id,
    import_user_id,
    title,
    source_type,
    source_date,
    provider,
    citation,
    summary,
    tags,
    now(),
    now()
  from bootstrap_import_sources imported_source
  where not exists (
    select 1
    from public.sources existing_source
    where existing_source.family_id = import_family_id
      and existing_source.citation = imported_source.citation
      and existing_source.deleted_at is null
      and existing_source.id <> imported_source.import_id
  )
  on conflict (id) do update set
    title = excluded.title,
    source_type = excluded.source_type,
    source_date = excluded.source_date,
    provider = excluded.provider,
    citation = excluded.citation,
    summary = excluded.summary,
    tags = excluded.tags,
    updated_at = now(),
    deleted_at = null;

  create temporary table bootstrap_import_source_map on commit drop as
  select
    imported_source.import_id,
    coalesce(existing_source.id, imported_source.import_id) as source_id
  from bootstrap_import_sources imported_source
  left join lateral (
    select id
    from public.sources
    where family_id = import_family_id
      and citation = imported_source.citation
      and deleted_at is null
    order by ('bootstrap_import' = any(tags)) asc, created_at asc
    limit 1
  ) existing_source on true;

  update public.sources duplicate_source
  set
    deleted_at = now(),
    updated_at = now()
  where duplicate_source.family_id = import_family_id
    and duplicate_source.deleted_at is null
    and 'bootstrap_import' = any(duplicate_source.tags)
    and exists (
      select 1
      from public.sources canonical_source
      where canonical_source.family_id = duplicate_source.family_id
        and canonical_source.citation = duplicate_source.citation
        and canonical_source.deleted_at is null
        and canonical_source.id <> duplicate_source.id
        and not ('bootstrap_import' = any(canonical_source.tags))
    );
`
    : "";

  const eventSql = eventRows.length
    ? `
  create temporary table bootstrap_import_events (
    import_id uuid primary key,
    type text not null,
    occurred_at timestamptz not null,
    title text not null,
    summary text,
    provider text,
    location text,
    source_import_id uuid not null,
    diagnostic_question text,
    baseline_before text,
    immediate_effect text,
    effect_24h text,
    effect_72h text,
    effect_1w text,
    effect_1m text,
    new_symptoms text,
    answered_question text,
    repeat_recommendation text
  ) on commit drop;

  insert into bootstrap_import_events (
    import_id,
    type,
    occurred_at,
    title,
    summary,
    provider,
    location,
    source_import_id,
    diagnostic_question,
    baseline_before,
    immediate_effect,
    effect_24h,
    effect_72h,
    effect_1w,
    effect_1m,
    new_symptoms,
    answered_question,
    repeat_recommendation
  )
  values
${valuesBlock(eventRows, eventValues)};

  insert into public.events (
    id,
    family_id,
    user_id,
    type,
    occurred_at,
    ended_at,
    title,
    summary,
    provider,
    location,
    source_id,
    diagnostic_question,
    baseline_before,
    immediate_effect,
    effect_24h,
    effect_72h,
    effect_1w,
    effect_1m,
    new_symptoms,
    answered_question,
    repeat_recommendation,
    created_at,
    updated_at
  )
  select
    imported_event.import_id,
    import_family_id,
    import_user_id,
    imported_event.type,
    imported_event.occurred_at,
    null,
    imported_event.title,
    imported_event.summary,
    imported_event.provider,
    imported_event.location,
    source_map.source_id,
    imported_event.diagnostic_question,
    imported_event.baseline_before,
    imported_event.immediate_effect,
    imported_event.effect_24h,
    imported_event.effect_72h,
    imported_event.effect_1w,
    imported_event.effect_1m,
    imported_event.new_symptoms,
    imported_event.answered_question,
    imported_event.repeat_recommendation,
    now(),
    now()
  from bootstrap_import_events imported_event
  join bootstrap_import_source_map source_map
    on source_map.import_id = imported_event.source_import_id
  on conflict (id) do update set
    type = excluded.type,
    occurred_at = excluded.occurred_at,
    ended_at = excluded.ended_at,
    title = excluded.title,
    summary = excluded.summary,
    provider = excluded.provider,
    location = excluded.location,
    source_id = excluded.source_id,
    diagnostic_question = excluded.diagnostic_question,
    baseline_before = excluded.baseline_before,
    immediate_effect = excluded.immediate_effect,
    effect_24h = excluded.effect_24h,
    effect_72h = excluded.effect_72h,
    effect_1w = excluded.effect_1w,
    effect_1m = excluded.effect_1m,
    new_symptoms = excluded.new_symptoms,
    answered_question = excluded.answered_question,
    repeat_recommendation = excluded.repeat_recommendation,
    updated_at = now(),
    deleted_at = null;
`
    : "";

  return `-- Generated by scripts/historical-import/apply-reviewed-import.mjs.
-- Review this file before applying. It is deterministic and safe to rerun.

do $$
declare
  import_user_id uuid;
  import_family_id uuid;
begin
  select id, family_id
    into import_user_id, import_family_id
  from public.profiles
  where email = ${sqlLiteral(profileEmail)}
    and deleted_at is null
  limit 1;

  if import_user_id is null then
    raise exception 'No active profile found for %', ${sqlLiteral(profileEmail)};
  end if;
${sourceSql}${eventSql}
end $$;
`;
}

async function main() {
  const sources = await readJsonl(manifestPath);
  const events = await readJsonl(eventsPath);
  const sql = buildSql(sources, events);

  await import("node:fs/promises").then(({ writeFile }) =>
    writeFile(outputPath, sql, "utf8"),
  );

  const acceptedSources = sources.filter(isAccepted).length;
  const acceptedEvents = events.filter(isAccepted).length;

  console.log(
    `Wrote ${path.relative(appRoot, outputPath)} with ${acceptedSources} sources and ${acceptedEvents} events.`,
  );

  if (!shouldApply) {
    console.log(
      `Apply after review with: bash scripts/run-supabase-sql.sh ${path.relative(
        appRoot,
        outputPath,
      )}`,
    );
    return;
  }

  const result = spawnSync(
    "bash",
    ["scripts/run-supabase-sql.sh", path.relative(appRoot, outputPath)],
    {
      cwd: appRoot,
      stdio: "inherit",
    },
  );

  if (result.status !== 0) process.exitCode = result.status ?? 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
