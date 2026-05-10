-- AI import assistant: review-gated drafts generated from unstructured text.

create table if not exists public.ai_import_sessions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  user_id uuid not null references public.profiles(id),
  source_id uuid references public.sources(id) on delete set null,
  input_label text,
  raw_text text not null,
  requested_target_types text[] not null default '{}',
  status text not null default 'drafting' check (
    status in ('drafting', 'ready_for_review', 'committed', 'failed', 'rejected')
  ),
  model text,
  prompt_version text not null default 'ai-import-v1',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (
    requested_target_types <@ array[
      'entry',
      'procedure_event',
      'source',
      'medication',
      'medication_response',
      'appointment',
      'task',
      'decision'
    ]::text[]
  )
);

create index if not exists ai_import_sessions_family_created_idx
  on public.ai_import_sessions (family_id, created_at desc)
  where deleted_at is null;

create index if not exists ai_import_sessions_status_idx
  on public.ai_import_sessions (family_id, status, created_at desc)
  where deleted_at is null;

create index if not exists ai_import_sessions_source_idx
  on public.ai_import_sessions (source_id)
  where deleted_at is null;

create table if not exists public.ai_import_drafts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  user_id uuid not null references public.profiles(id),
  session_id uuid not null references public.ai_import_sessions(id) on delete cascade,
  target_type text not null check (
    target_type in (
      'entry',
      'procedure_event',
      'source',
      'medication',
      'medication_response',
      'appointment',
      'task',
      'decision'
    )
  ),
  status text not null default 'proposed' check (
    status in ('proposed', 'committed', 'rejected', 'failed')
  ),
  title text,
  proposed_payload jsonb not null default '{}'::jsonb,
  confidence text not null default 'low' check (confidence in ('high', 'medium', 'low')),
  missing_fields text[] not null default '{}',
  evidence_spans jsonb not null default '[]'::jsonb,
  warnings text[] not null default '{}',
  validation_errors jsonb not null default '[]'::jsonb,
  committed_entity_type text check (
    committed_entity_type is null
    or committed_entity_type in (
      'entry',
      'procedure_event',
      'source',
      'medication',
      'medication_response',
      'appointment',
      'task',
      'decision'
    )
  ),
  committed_entity_id uuid,
  committed_at timestamptz,
  rejected_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists ai_import_drafts_session_idx
  on public.ai_import_drafts (session_id, created_at)
  where deleted_at is null;

create index if not exists ai_import_drafts_family_status_idx
  on public.ai_import_drafts (family_id, status, created_at desc)
  where deleted_at is null;

create index if not exists ai_import_drafts_target_idx
  on public.ai_import_drafts (family_id, target_type, status)
  where deleted_at is null;

alter table public.ai_import_sessions enable row level security;
alter table public.ai_import_drafts enable row level security;

drop policy if exists ai_import_sessions_select_family
  on public.ai_import_sessions;
create policy ai_import_sessions_select_family
  on public.ai_import_sessions
  for select
  to authenticated
  using (family_id = public.current_family_id() and deleted_at is null);

drop policy if exists ai_import_sessions_insert_writable_family
  on public.ai_import_sessions;
create policy ai_import_sessions_insert_writable_family
  on public.ai_import_sessions
  for insert
  to authenticated
  with check (public.can_write_family(family_id));

drop policy if exists ai_import_sessions_update_writable_family
  on public.ai_import_sessions;
create policy ai_import_sessions_update_writable_family
  on public.ai_import_sessions
  for update
  to authenticated
  using (public.can_write_family(family_id) and deleted_at is null)
  with check (public.can_write_family(family_id));

drop policy if exists ai_import_drafts_select_family
  on public.ai_import_drafts;
create policy ai_import_drafts_select_family
  on public.ai_import_drafts
  for select
  to authenticated
  using (family_id = public.current_family_id() and deleted_at is null);

drop policy if exists ai_import_drafts_insert_writable_family
  on public.ai_import_drafts;
create policy ai_import_drafts_insert_writable_family
  on public.ai_import_drafts
  for insert
  to authenticated
  with check (public.can_write_family(family_id));

drop policy if exists ai_import_drafts_update_writable_family
  on public.ai_import_drafts;
create policy ai_import_drafts_update_writable_family
  on public.ai_import_drafts
  for update
  to authenticated
  using (public.can_write_family(family_id) and deleted_at is null)
  with check (public.can_write_family(family_id));

grant select, insert, update on table
  public.ai_import_sessions,
  public.ai_import_drafts
to authenticated;

drop trigger if exists ai_import_sessions_set_updated_at
  on public.ai_import_sessions;
create trigger ai_import_sessions_set_updated_at
  before update on public.ai_import_sessions
  for each row execute procedure public.set_updated_at();

drop trigger if exists ai_import_drafts_set_updated_at
  on public.ai_import_drafts;
create trigger ai_import_drafts_set_updated_at
  before update on public.ai_import_drafts
  for each row execute procedure public.set_updated_at();

drop trigger if exists ai_import_sessions_audit_row_change
  on public.ai_import_sessions;
create trigger ai_import_sessions_audit_row_change
  after insert or update on public.ai_import_sessions
  for each row execute procedure public.audit_row_change();

drop trigger if exists ai_import_drafts_audit_row_change
  on public.ai_import_drafts;
create trigger ai_import_drafts_audit_row_change
  after insert or update on public.ai_import_drafts
  for each row execute procedure public.audit_row_change();

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
    'ai_import_drafts'
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
