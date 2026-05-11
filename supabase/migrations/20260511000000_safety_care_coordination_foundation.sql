-- Safety and care coordination backend foundation.
-- These tables support witness-style emergency context and care coordination
-- without turning Bella into a diagnostic engine.

create table if not exists public.care_team_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  user_id uuid not null references public.profiles(id),
  subject_user_id uuid not null references public.profiles(id),
  entered_by_user_id uuid not null references public.profiles(id),
  name text not null,
  organization text,
  specialty text,
  role text,
  portal_url text,
  contact_notes text,
  manages text,
  manages_tags text[] not null default '{}',
  last_visit_at timestamptz,
  next_visit_at timestamptz,
  active boolean not null default true,
  last_reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists care_team_members_family_active_name_idx
  on public.care_team_members (family_id, active, name)
  where deleted_at is null;

create index if not exists care_team_members_next_visit_idx
  on public.care_team_members (family_id, next_visit_at)
  where deleted_at is null;

create table if not exists public.avoid_contraindications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  user_id uuid not null references public.profiles(id),
  subject_user_id uuid not null references public.profiles(id),
  entered_by_user_id uuid not null references public.profiles(id),
  category text not null check (
    category in (
      'allergy',
      'medication_intolerance',
      'procedure_precaution',
      'physical_do_not',
      'care_context_warning'
    )
  ),
  severity text not null default 'moderate' check (
    severity in ('info', 'low', 'moderate', 'high', 'critical')
  ),
  title text not null,
  reaction_description text,
  evidence_source text,
  source_id uuid references public.sources(id) on delete set null,
  active boolean not null default true,
  last_reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists avoid_contraindications_family_active_idx
  on public.avoid_contraindications (family_id, active, category, severity)
  where deleted_at is null;

create index if not exists avoid_contraindications_source_idx
  on public.avoid_contraindications (source_id)
  where deleted_at is null;

create table if not exists public.case_summary_versions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  user_id uuid not null references public.profiles(id),
  subject_user_id uuid not null references public.profiles(id),
  entered_by_user_id uuid not null references public.profiles(id),
  summary_text text not null,
  calibration_note text,
  status text not null default 'draft' check (
    status in ('draft', 'active', 'superseded', 'retired')
  ),
  authored_by_text text,
  reviewed_by_text text,
  reviewed_at timestamptz,
  source_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists case_summary_versions_one_active_per_subject_idx
  on public.case_summary_versions (family_id, subject_user_id)
  where status = 'active' and deleted_at is null;

create index if not exists case_summary_versions_family_status_idx
  on public.case_summary_versions (family_id, subject_user_id, status, updated_at desc)
  where deleted_at is null;

create table if not exists public.emergency_packet_reviews (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  user_id uuid not null references public.profiles(id),
  subject_user_id uuid not null references public.profiles(id),
  entered_by_user_id uuid not null references public.profiles(id),
  reviewed_by_user_id uuid references public.profiles(id),
  reviewed_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists emergency_packet_reviews_family_reviewed_idx
  on public.emergency_packet_reviews (family_id, subject_user_id, reviewed_at desc)
  where deleted_at is null;

create or replace function public.apply_record_attribution_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.subject_user_id is null then
    new.subject_user_id := new.user_id;
  end if;

  if new.entered_by_user_id is null then
    new.entered_by_user_id := coalesce(auth.uid(), new.user_id);
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = new.subject_user_id
      and p.family_id = new.family_id
      and p.deleted_at is null
  ) then
    raise exception 'subject_user_id must belong to the record family';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = new.entered_by_user_id
      and p.family_id = new.family_id
      and p.deleted_at is null
  ) then
    raise exception 'entered_by_user_id must belong to the record family';
  end if;

  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'entries',
    'flare_checkpoints',
    'vasomotor_measurements',
    'sources',
    'events',
    'diagnoses',
    'decisions',
    'appointments',
    'medications',
    'medication_responses'
  ]
  loop
    execute format(
      'alter table public.%I add column if not exists subject_user_id uuid references public.profiles(id)',
      table_name
    );
    execute format(
      'alter table public.%I add column if not exists entered_by_user_id uuid references public.profiles(id)',
      table_name
    );
  end loop;
end;
$$;

update public.entries
set entered_by_user_id = coalesce(entered_by_user_id, created_by, user_id)
where entered_by_user_id is null;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'entries',
    'flare_checkpoints',
    'vasomotor_measurements',
    'sources',
    'events',
    'diagnoses',
    'decisions',
    'appointments',
    'medications',
    'medication_responses'
  ]
  loop
    execute format(
      'update public.%I set subject_user_id = coalesce(subject_user_id, user_id) where subject_user_id is null',
      table_name
    );
    execute format(
      'update public.%I set entered_by_user_id = coalesce(entered_by_user_id, user_id) where entered_by_user_id is null',
      table_name
    );
    execute format(
      'alter table public.%I alter column subject_user_id set not null',
      table_name
    );
    execute format(
      'alter table public.%I alter column entered_by_user_id set not null',
      table_name
    );
    execute format(
      'create index if not exists %I on public.%I (family_id, subject_user_id) where deleted_at is null',
      table_name || '_subject_user_idx',
      table_name
    );
    execute format(
      'create index if not exists %I on public.%I (family_id, entered_by_user_id) where deleted_at is null',
      table_name || '_entered_by_user_idx',
      table_name
    );
  end loop;
end;
$$;

drop index if exists public.entries_one_active_flare_per_user_idx;

create unique index if not exists entries_one_active_flare_per_subject_idx
  on public.entries (family_id, subject_user_id)
  where is_flare = true and flare_status = 'active' and deleted_at is null;

alter table public.appointments
  add column if not exists care_team_member_id uuid references public.care_team_members(id) on delete set null;
alter table public.decisions
  add column if not exists owner_care_team_member_id uuid references public.care_team_members(id) on delete set null;
alter table public.medications
  add column if not exists prescriber_care_team_member_id uuid references public.care_team_members(id) on delete set null;
alter table public.sources
  add column if not exists care_team_member_id uuid references public.care_team_members(id) on delete set null;
alter table public.events
  add column if not exists care_team_member_id uuid references public.care_team_members(id) on delete set null;

create index if not exists appointments_care_team_member_idx
  on public.appointments (care_team_member_id)
  where deleted_at is null;

create index if not exists decisions_owner_care_team_member_idx
  on public.decisions (owner_care_team_member_id)
  where deleted_at is null;

create index if not exists medications_prescriber_care_team_member_idx
  on public.medications (prescriber_care_team_member_id)
  where deleted_at is null;

create index if not exists sources_care_team_member_idx
  on public.sources (care_team_member_id)
  where deleted_at is null;

create index if not exists events_care_team_member_idx
  on public.events (care_team_member_id)
  where deleted_at is null;

create or replace function public.ensure_care_team_link_family()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  linked_member_id uuid;
begin
  linked_member_id := case tg_table_name
    when 'appointments' then new.care_team_member_id
    when 'decisions' then new.owner_care_team_member_id
    when 'medications' then new.prescriber_care_team_member_id
    when 'sources' then new.care_team_member_id
    when 'events' then new.care_team_member_id
    else null
  end;

  if linked_member_id is not null and not exists (
    select 1
    from public.care_team_members c
    where c.id = linked_member_id
      and c.family_id = new.family_id
      and c.deleted_at is null
  ) then
    raise exception 'care team member link must belong to the record family';
  end if;

  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'appointments',
    'decisions',
    'medications',
    'sources',
    'events'
  ]
  loop
    execute format(
      'drop trigger if exists %I on public.%I',
      table_name || '_ensure_care_team_link_family',
      table_name
    );
    execute format(
      'create trigger %I before insert or update on public.%I for each row execute procedure public.ensure_care_team_link_family()',
      table_name || '_ensure_care_team_link_family',
      table_name
    );
  end loop;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'entries',
    'flare_checkpoints',
    'vasomotor_measurements',
    'sources',
    'events',
    'diagnoses',
    'decisions',
    'appointments',
    'medications',
    'medication_responses',
    'care_team_members',
    'avoid_contraindications',
    'case_summary_versions',
    'emergency_packet_reviews'
  ]
  loop
    execute format(
      'drop trigger if exists %I on public.%I',
      table_name || '_apply_record_attribution_defaults',
      table_name
    );
    execute format(
      'create trigger %I before insert or update on public.%I for each row execute procedure public.apply_record_attribution_defaults()',
      table_name || '_apply_record_attribution_defaults',
      table_name
    );
  end loop;
end;
$$;

alter table public.care_team_members enable row level security;
alter table public.avoid_contraindications enable row level security;
alter table public.case_summary_versions enable row level security;
alter table public.emergency_packet_reviews enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'care_team_members',
    'avoid_contraindications',
    'case_summary_versions',
    'emergency_packet_reviews'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_select_family', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (family_id = public.current_family_id() and deleted_at is null)',
      table_name || '_select_family',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_insert_writable_family', table_name);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.can_write_family(family_id))',
      table_name || '_insert_writable_family',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_update_writable_family', table_name);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.can_write_family(family_id) and deleted_at is null) with check (public.can_write_family(family_id))',
      table_name || '_update_writable_family',
      table_name
    );
  end loop;
end;
$$;

grant select, insert, update on table
  public.care_team_members,
  public.avoid_contraindications,
  public.case_summary_versions,
  public.emergency_packet_reviews
to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'care_team_members',
    'avoid_contraindications',
    'case_summary_versions',
    'emergency_packet_reviews'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_set_updated_at', table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute procedure public.set_updated_at()',
      table_name || '_set_updated_at',
      table_name
    );

    execute format('drop trigger if exists %I on public.%I', table_name || '_audit_row_change', table_name);
    execute format(
      'create trigger %I after insert or update on public.%I for each row execute procedure public.audit_row_change()',
      table_name || '_audit_row_change',
      table_name
    );
  end loop;
end;
$$;

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
    'apple_health_daily_summaries',
    'care_team_members',
    'avoid_contraindications',
    'case_summary_versions',
    'emergency_packet_reviews'
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
    'apple_health_daily_summaries',
    'care_team_members',
    'avoid_contraindications',
    'case_summary_versions',
    'emergency_packet_reviews'
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
