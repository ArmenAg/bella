-- Apple Health export importer.
-- Manual export.zip imports are parsed into deterministic, idempotent samples
-- and daily summaries. Raw samples are not individually audited to avoid
-- unbounded audit-log growth; import job rows preserve provenance and counts.

update storage.buckets
set
  file_size_limit = 524288000,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/quicktime',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/zip',
    'application/x-zip-compressed'
  ]
where id = 'bella-private-uploads';

create table if not exists public.apple_health_imports (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  user_id uuid not null references public.profiles(id),
  attachment_id uuid references public.attachments(id) on delete set null,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  file_name text,
  file_sha256 text,
  export_started_at timestamptz,
  export_ended_at timestamptz,
  scanned_record_count integer not null default 0 check (scanned_record_count >= 0),
  imported_sample_count integer not null default 0 check (imported_sample_count >= 0),
  duplicate_sample_count integer not null default 0 check (duplicate_sample_count >= 0),
  skipped_record_count integer not null default 0 check (skipped_record_count >= 0),
  daily_summary_count integer not null default 0 check (daily_summary_count >= 0),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists apple_health_imports_family_created_idx
  on public.apple_health_imports (family_id, created_at desc)
  where deleted_at is null;

create index if not exists apple_health_imports_status_idx
  on public.apple_health_imports (family_id, status, created_at desc)
  where deleted_at is null;

create index if not exists apple_health_imports_attachment_idx
  on public.apple_health_imports (attachment_id)
  where deleted_at is null;

create table if not exists public.apple_health_samples (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  user_id uuid not null references public.profiles(id),
  import_id uuid references public.apple_health_imports(id) on delete set null,
  external_key text not null,
  apple_type text not null,
  normalized_type text not null,
  sample_kind text not null check (sample_kind in ('quantity', 'category', 'workout')),
  source_name text,
  source_version text,
  device text,
  unit text,
  value_numeric numeric,
  value_text text,
  start_at timestamptz,
  end_at timestamptz,
  creation_at timestamptz,
  duration_seconds numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (family_id, external_key)
);

create index if not exists apple_health_samples_family_type_start_idx
  on public.apple_health_samples (family_id, normalized_type, start_at desc)
  where deleted_at is null;

create index if not exists apple_health_samples_import_idx
  on public.apple_health_samples (import_id)
  where deleted_at is null;

create table if not exists public.apple_health_daily_summaries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  summary_date date not null,
  metric_type text not null,
  unit text,
  sample_count integer not null default 0 check (sample_count >= 0),
  value_sum numeric,
  value_avg numeric,
  value_min numeric,
  value_max numeric,
  first_sample_at timestamptz,
  last_sample_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (family_id, summary_date, metric_type)
);

create index if not exists apple_health_daily_summaries_family_date_idx
  on public.apple_health_daily_summaries (family_id, summary_date desc, metric_type)
  where deleted_at is null;

alter table public.apple_health_imports enable row level security;
alter table public.apple_health_samples enable row level security;
alter table public.apple_health_daily_summaries enable row level security;

drop policy if exists apple_health_imports_select_family
  on public.apple_health_imports;
create policy apple_health_imports_select_family
  on public.apple_health_imports
  for select
  to authenticated
  using (family_id = public.current_family_id() and deleted_at is null);

drop policy if exists apple_health_imports_insert_writable_family
  on public.apple_health_imports;
create policy apple_health_imports_insert_writable_family
  on public.apple_health_imports
  for insert
  to authenticated
  with check (public.can_write_family(family_id));

drop policy if exists apple_health_imports_update_writable_family
  on public.apple_health_imports;
create policy apple_health_imports_update_writable_family
  on public.apple_health_imports
  for update
  to authenticated
  using (public.can_write_family(family_id) and deleted_at is null)
  with check (public.can_write_family(family_id));

drop policy if exists apple_health_samples_select_family
  on public.apple_health_samples;
create policy apple_health_samples_select_family
  on public.apple_health_samples
  for select
  to authenticated
  using (family_id = public.current_family_id() and deleted_at is null);

drop policy if exists apple_health_samples_insert_writable_family
  on public.apple_health_samples;
create policy apple_health_samples_insert_writable_family
  on public.apple_health_samples
  for insert
  to authenticated
  with check (public.can_write_family(family_id));

drop policy if exists apple_health_samples_update_writable_family
  on public.apple_health_samples;
create policy apple_health_samples_update_writable_family
  on public.apple_health_samples
  for update
  to authenticated
  using (public.can_write_family(family_id) and deleted_at is null)
  with check (public.can_write_family(family_id));

drop policy if exists apple_health_daily_summaries_select_family
  on public.apple_health_daily_summaries;
create policy apple_health_daily_summaries_select_family
  on public.apple_health_daily_summaries
  for select
  to authenticated
  using (family_id = public.current_family_id() and deleted_at is null);

drop policy if exists apple_health_daily_summaries_insert_writable_family
  on public.apple_health_daily_summaries;
create policy apple_health_daily_summaries_insert_writable_family
  on public.apple_health_daily_summaries
  for insert
  to authenticated
  with check (public.can_write_family(family_id));

drop policy if exists apple_health_daily_summaries_update_writable_family
  on public.apple_health_daily_summaries;
create policy apple_health_daily_summaries_update_writable_family
  on public.apple_health_daily_summaries
  for update
  to authenticated
  using (public.can_write_family(family_id) and deleted_at is null)
  with check (public.can_write_family(family_id));

grant select, insert, update on table
  public.apple_health_imports,
  public.apple_health_samples,
  public.apple_health_daily_summaries
to authenticated;

drop trigger if exists apple_health_imports_set_updated_at
  on public.apple_health_imports;
create trigger apple_health_imports_set_updated_at
before update on public.apple_health_imports
for each row execute procedure public.set_updated_at();

drop trigger if exists apple_health_samples_set_updated_at
  on public.apple_health_samples;
create trigger apple_health_samples_set_updated_at
before update on public.apple_health_samples
for each row execute procedure public.set_updated_at();

drop trigger if exists apple_health_daily_summaries_set_updated_at
  on public.apple_health_daily_summaries;
create trigger apple_health_daily_summaries_set_updated_at
before update on public.apple_health_daily_summaries
for each row execute procedure public.set_updated_at();

drop trigger if exists apple_health_imports_audit_row_change
  on public.apple_health_imports;
create trigger apple_health_imports_audit_row_change
after insert or update on public.apple_health_imports
for each row execute procedure public.audit_row_change();

drop trigger if exists apple_health_daily_summaries_audit_row_change
  on public.apple_health_daily_summaries;
create trigger apple_health_daily_summaries_audit_row_change
after insert or update on public.apple_health_daily_summaries
for each row execute procedure public.audit_row_change();

create or replace function public.refresh_apple_health_daily_summaries(
  start_date date,
  end_date date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_family_id uuid;
  inserted_count integer := 0;
begin
  target_family_id := public.current_family_id();

  if target_family_id is null then
    raise exception 'Authentication required';
  end if;

  if not public.can_write_family(target_family_id) then
    raise exception 'insufficient role for Apple Health summary refresh';
  end if;

  delete from public.apple_health_daily_summaries
  where family_id = target_family_id
    and summary_date between start_date and end_date;

  with normalized as (
    select
      s.family_id,
      (s.start_at at time zone 'UTC')::date as summary_date,
      s.normalized_type as metric_type,
      case
        when s.normalized_type in ('sleep_asleep_minutes', 'sleep_in_bed_minutes', 'workout_minutes') then 'min'
        else s.unit
      end as unit,
      case
        when s.normalized_type in ('sleep_asleep_minutes', 'sleep_in_bed_minutes', 'workout_minutes')
          then s.duration_seconds / 60.0
        else s.value_numeric
      end as aggregate_value,
      s.start_at,
      s.end_at
    from public.apple_health_samples s
    where s.family_id = target_family_id
      and s.deleted_at is null
      and s.start_at is not null
      and (s.start_at at time zone 'UTC')::date between start_date and end_date
  )
  insert into public.apple_health_daily_summaries (
    family_id,
    summary_date,
    metric_type,
    unit,
    sample_count,
    value_sum,
    value_avg,
    value_min,
    value_max,
    first_sample_at,
    last_sample_at,
    metadata
  )
  select
    family_id,
    summary_date,
    metric_type,
    max(unit),
    count(*)::integer,
    sum(aggregate_value),
    avg(aggregate_value),
    min(aggregate_value),
    max(aggregate_value),
    min(start_at),
    max(coalesce(end_at, start_at)),
    jsonb_build_object('generated_by', 'refresh_apple_health_daily_summaries')
  from normalized
  where aggregate_value is not null
  group by family_id, summary_date, metric_type;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

grant execute on function public.refresh_apple_health_daily_summaries(date, date)
to authenticated;

create or replace function public.soft_delete_record(target_table text, target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed_tables text[] := array[
    'entries',
    'flare_checkpoints',
    'vasomotor_measurements',
    'events',
    'attachments',
    'attachment_links',
    'diagnoses',
    'evidence_links',
    'decisions',
    'decision_evidence_links',
    'appointments',
    'medications',
    'medication_responses',
    'sources',
    'tasks',
    'ai_import_sessions',
    'ai_import_drafts',
    'ai_agent_threads',
    'ai_agent_messages',
    'ai_agent_tool_calls',
    'ai_agent_context_snapshots',
    'apple_health_imports',
    'apple_health_samples',
    'apple_health_daily_summaries'
  ];
begin
  if not target_table = any(allowed_tables) then
    raise exception 'soft delete not allowed for table %', target_table;
  end if;

  if public.app_role_name() not in ('primary', 'caregiver') then
    raise exception 'insufficient role for soft delete';
  end if;

  execute format(
    'update public.%I set deleted_at = now() where id = $1 and family_id = public.current_family_id() and deleted_at is null',
    target_table
  )
  using target_id;
end;
$$;

grant execute on function public.soft_delete_record(text, uuid) to authenticated;

create or replace function public.export_family_data(include_soft_deleted boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_family_id uuid;
  caller_role text;
  table_name text;
  result jsonb := '{}'::jsonb;
  table_rows jsonb;
  domain_tables text[] := array[
    'profiles',
    'entries',
    'entry_regions',
    'entry_symptoms',
    'entry_triggers',
    'flare_checkpoints',
    'attachments',
    'vasomotor_measurements',
    'sources',
    'events',
    'attachment_links',
    'diagnoses',
    'evidence_links',
    'decisions',
    'decision_evidence_links',
    'appointments',
    'medications',
    'medication_responses',
    'tasks',
    'ai_import_sessions',
    'ai_import_drafts',
    'ai_agent_threads',
    'ai_agent_messages',
    'ai_agent_tool_calls',
    'ai_agent_context_snapshots',
    'apple_health_imports',
    'apple_health_samples',
    'apple_health_daily_summaries'
  ];
  reference_tables text[] := array[
    'roles',
    'body_regions',
    'symptoms',
    'triggers'
  ];
begin
  target_family_id := public.current_family_id();
  caller_role := public.app_role_name();

  if target_family_id is null then
    raise exception 'Authentication required';
  end if;

  if include_soft_deleted and caller_role not in ('primary', 'caregiver') then
    raise exception 'insufficient role for soft-deleted export';
  end if;

  foreach table_name in array reference_tables
  loop
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), ''[]''::jsonb) from public.%I t where ($1 or t.deleted_at is null)',
      table_name
    )
    using include_soft_deleted
    into table_rows;

    result := jsonb_set(result, array[table_name], table_rows, true);
  end loop;

  foreach table_name in array domain_tables
  loop
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(t) order by coalesce(t.updated_at, t.created_at)), ''[]''::jsonb) from public.%I t where t.family_id = $1 and ($2 or t.deleted_at is null)',
      table_name
    )
    using target_family_id, include_soft_deleted
    into table_rows;

    result := jsonb_set(result, array[table_name], table_rows, true);
  end loop;

  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at), '[]'::jsonb)
  into table_rows
  from public.audit_log a
  where a.family_id = target_family_id;

  result := jsonb_set(result, array['audit_log'], table_rows, true);

  return result;
end;
$$;

grant execute on function public.export_family_data(boolean) to authenticated;
