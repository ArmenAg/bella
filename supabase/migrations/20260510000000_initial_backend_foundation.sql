-- Bella Care Tracker backend foundation.
-- Raw Supabase SQL is the migration source of truth so RLS, policies, storage,
-- and helper functions stay reviewable beside the application code.

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  family_id uuid not null default gen_random_uuid(),
  email text not null,
  display_name text,
  role_id uuid not null references public.roles(id),
  mfa_enabled boolean not null default false,
  privacy_ack_at timestamptz,
  invited_by uuid references public.profiles(id),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists profiles_family_id_idx
  on public.profiles (family_id)
  where deleted_at is null;

create index if not exists profiles_role_id_idx
  on public.profiles (role_id)
  where deleted_at is null;

create table if not exists public.body_regions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  side text check (side in ('left', 'right', 'bilateral', 'midline', 'unknown')),
  parent_region_id uuid references public.body_regions(id),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists body_regions_parent_idx
  on public.body_regions (parent_region_id)
  where deleted_at is null;

create table if not exists public.symptoms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists symptoms_category_idx
  on public.symptoms (category, display_order)
  where deleted_at is null;

create table if not exists public.triggers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  display_order integer not null default 0,
  is_bella_specific boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists triggers_category_idx
  on public.triggers (category, display_order)
  where deleted_at is null;

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  user_id uuid not null references public.profiles(id),
  created_by uuid references public.profiles(id),
  type text not null check (
    type in (
      'baseline',
      'flare',
      'recovery',
      'procedure_related',
      'medication_related',
      'freeform',
      'vasomotor'
    )
  ),
  occurred_at timestamptz not null,
  ended_at timestamptz,
  title text not null,
  pain_current smallint check (pain_current between 0 and 10),
  pain_peak smallint check (pain_peak between 0 and 10),
  pain_average smallint check (pain_average between 0 and 10),
  primary_trigger_id uuid references public.triggers(id),
  notes text,
  function_impact text[] not null default '{}',
  interventions_tried text[] not null default '{}',
  response text,
  is_flare boolean not null default false,
  flare_status text check (flare_status in ('active', 'ended', 'cancelled')),
  recovery_minutes integer check (recovery_minutes is null or recovery_minutes >= 0),
  client_recorded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists entries_family_occurred_idx
  on public.entries (family_id, occurred_at desc)
  where deleted_at is null;

create index if not exists entries_family_type_idx
  on public.entries (family_id, type, occurred_at desc)
  where deleted_at is null;

create index if not exists entries_family_flare_idx
  on public.entries (family_id, is_flare, occurred_at desc)
  where deleted_at is null;

create index if not exists entries_primary_trigger_idx
  on public.entries (primary_trigger_id)
  where deleted_at is null;

create unique index if not exists entries_one_active_flare_per_user_idx
  on public.entries (family_id, user_id)
  where is_flare = true and flare_status = 'active' and deleted_at is null;

create table if not exists public.entry_regions (
  family_id uuid not null,
  entry_id uuid not null references public.entries(id) on delete cascade,
  body_region_id uuid not null references public.body_regions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (entry_id, body_region_id)
);

create index if not exists entry_regions_region_idx
  on public.entry_regions (family_id, body_region_id)
  where deleted_at is null;

create table if not exists public.entry_symptoms (
  family_id uuid not null,
  entry_id uuid not null references public.entries(id) on delete cascade,
  symptom_id uuid not null references public.symptoms(id),
  severity smallint check (severity between 0 and 10),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (entry_id, symptom_id)
);

create index if not exists entry_symptoms_symptom_idx
  on public.entry_symptoms (family_id, symptom_id)
  where deleted_at is null;

create table if not exists public.entry_triggers (
  family_id uuid not null,
  entry_id uuid not null references public.entries(id) on delete cascade,
  trigger_id uuid not null references public.triggers(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (entry_id, trigger_id)
);

create index if not exists entry_triggers_trigger_idx
  on public.entry_triggers (family_id, trigger_id)
  where deleted_at is null;

create table if not exists public.flare_checkpoints (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  user_id uuid not null references public.profiles(id),
  entry_id uuid not null references public.entries(id) on delete cascade,
  checkpoint_type text not null check (
    checkpoint_type in ('start', '30m', '60m', '120m', '6h', '12h', '24h', '48h', 'custom')
  ),
  checkpoint_at timestamptz not null,
  pain_score smallint check (pain_score between 0 and 10),
  symptoms jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists flare_checkpoints_entry_idx
  on public.flare_checkpoints (entry_id, checkpoint_at)
  where deleted_at is null;

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  user_id uuid not null references public.profiles(id),
  bucket_id text not null default 'bella-private-uploads',
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  captured_at timestamptz,
  capture_timezone text,
  description text,
  gps_stripped boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (bucket_id, file_path)
);

create index if not exists attachments_family_created_idx
  on public.attachments (family_id, created_at desc)
  where deleted_at is null;

create index if not exists attachments_mime_idx
  on public.attachments (family_id, mime_type)
  where deleted_at is null;

create table if not exists public.vasomotor_measurements (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  user_id uuid not null references public.profiles(id),
  entry_id uuid references public.entries(id) on delete set null,
  measured_at timestamptz not null,
  site text not null,
  left_temp_c numeric(5, 2),
  right_temp_c numeric(5, 2),
  delta_c numeric(5, 2) generated always as (
    case
      when left_temp_c is null or right_temp_c is null then null
      else round((right_temp_c - left_temp_c)::numeric, 2)
    end
  ) stored,
  left_color text,
  right_color text,
  lighting_notes text,
  context text not null check (
    context in (
      'baseline',
      'active_flare',
      'recovery',
      'after_pressure_trigger',
      'after_medication',
      'after_procedure',
      'custom'
    )
  ),
  notes text,
  left_attachment_id uuid references public.attachments(id),
  right_attachment_id uuid references public.attachments(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists vasomotor_family_measured_idx
  on public.vasomotor_measurements (family_id, measured_at desc)
  where deleted_at is null;

create index if not exists vasomotor_entry_idx
  on public.vasomotor_measurements (entry_id)
  where deleted_at is null;

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  user_id uuid not null references public.profiles(id),
  title text not null,
  source_type text not null check (
    source_type in ('visit_note', 'imaging_report', 'lab_report', 'generated_report', 'literature', 'upload', 'other')
  ),
  source_date date,
  provider text,
  citation text,
  summary text,
  tags text[] not null default '{}',
  url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists sources_family_date_idx
  on public.sources (family_id, source_date desc)
  where deleted_at is null;

create index if not exists sources_type_idx
  on public.sources (family_id, source_type)
  where deleted_at is null;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  user_id uuid not null references public.profiles(id),
  type text not null check (
    type in (
      'injury',
      'procedure',
      'imaging',
      'test_lab',
      'consult',
      'medication_change',
      'ed_visit',
      'procedure_test',
      'other'
    )
  ),
  occurred_at timestamptz not null,
  ended_at timestamptz,
  title text not null,
  summary text,
  provider text,
  location text,
  source_id uuid references public.sources(id),
  diagnostic_question text,
  baseline_before text,
  immediate_effect text,
  effect_24h text,
  effect_72h text,
  effect_1w text,
  effect_1m text,
  new_symptoms text,
  answered_question text check (answered_question in ('yes', 'no', 'partially', 'unclear')),
  repeat_recommendation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists events_family_occurred_idx
  on public.events (family_id, occurred_at desc)
  where deleted_at is null;

create index if not exists events_type_idx
  on public.events (family_id, type, occurred_at desc)
  where deleted_at is null;

create table if not exists public.attachment_links (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  attachment_id uuid not null references public.attachments(id) on delete cascade,
  linked_type text not null check (
    linked_type in (
      'entry',
      'event',
      'decision',
      'diagnosis',
      'appointment',
      'source',
      'vasomotor_measurement',
      'medication_response'
    )
  ),
  linked_id uuid not null,
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (attachment_id, linked_type, linked_id)
);

create index if not exists attachment_links_target_idx
  on public.attachment_links (family_id, linked_type, linked_id)
  where deleted_at is null;

create table if not exists public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  user_id uuid not null references public.profiles(id),
  parent_diagnosis_id uuid references public.diagnoses(id),
  title text not null,
  status text not null check (
    status in ('unreviewed', 'suspected', 'supported', 'weakened', 'ruled_out', 'confirmed', 'monitoring')
  ),
  confidence text not null check (confidence in ('unknown', 'low', 'moderate', 'high')),
  summary text,
  why_considered text,
  evidence_for text,
  evidence_against text,
  tests_needed text,
  treatment_implications text,
  open_questions text[] not null default '{}',
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists diagnoses_family_status_idx
  on public.diagnoses (family_id, status, confidence)
  where deleted_at is null;

create index if not exists diagnoses_parent_idx
  on public.diagnoses (parent_diagnosis_id)
  where deleted_at is null;

create table if not exists public.evidence_links (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  diagnosis_id uuid not null references public.diagnoses(id) on delete cascade,
  linked_type text not null check (
    linked_type in (
      'entry',
      'event',
      'attachment',
      'source',
      'decision',
      'vasomotor_measurement',
      'medication_response',
      'diagnosis'
    )
  ),
  linked_id uuid not null,
  direction text not null check (direction in ('supports', 'weakens', 'neutral', 'pending')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (diagnosis_id, linked_type, linked_id)
);

create index if not exists evidence_links_target_idx
  on public.evidence_links (family_id, linked_type, linked_id)
  where deleted_at is null;

create index if not exists evidence_links_diagnosis_idx
  on public.evidence_links (diagnosis_id, direction)
  where deleted_at is null;

create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  user_id uuid not null references public.profiles(id),
  title text not null,
  status text not null check (
    status in ('open', 'waiting_on_test', 'waiting_on_clinician', 'decided', 'rejected', 'revisiting')
  ),
  question text not null,
  options jsonb not null default '[]'::jsonb,
  evidence_for text,
  evidence_against text,
  risks text,
  what_would_change text,
  owner text,
  target_date date,
  final_decision text,
  rationale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists decisions_family_status_idx
  on public.decisions (family_id, status, target_date)
  where deleted_at is null;

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  user_id uuid not null references public.profiles(id),
  date_time timestamptz not null,
  provider text,
  specialty text,
  location text,
  location_url text,
  purpose text not null,
  prep_notes text,
  questions text[] not null default '{}',
  files_to_show text[] not null default '{}',
  decisions_needed text[] not null default '{}',
  after_visit_summary text,
  follow_up_tasks text[] not null default '{}',
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists appointments_family_date_idx
  on public.appointments (family_id, date_time)
  where deleted_at is null;

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  user_id uuid not null references public.profiles(id),
  name text not null,
  dose text,
  route text,
  frequency text,
  start_date date,
  stop_date date,
  prescriber text,
  reason text,
  status text not null default 'active' check (status in ('active', 'paused', 'stopped', 'planned')),
  helped_pain boolean,
  helped_sleep boolean,
  helped_anxiety boolean,
  helped_function boolean,
  side_effects text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists medications_family_status_idx
  on public.medications (family_id, status, name)
  where deleted_at is null;

create table if not exists public.medication_responses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  user_id uuid not null references public.profiles(id),
  medication_id uuid references public.medications(id) on delete set null,
  entry_id uuid references public.entries(id) on delete set null,
  taken_at timestamptz not null,
  reason text,
  pain_before smallint check (pain_before between 0 and 10),
  pain_after_30m smallint check (pain_after_30m between 0 and 10),
  pain_after_60m smallint check (pain_after_60m between 0 and 10),
  pain_after_120m smallint check (pain_after_120m between 0 and 10),
  sedation_effect text,
  cognition_effect text,
  gait_effect text,
  side_effects text,
  helped text check (helped in ('helped', 'unclear', 'worsened')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists medication_responses_med_date_idx
  on public.medication_responses (family_id, medication_id, taken_at desc)
  where deleted_at is null;

create index if not exists medication_responses_entry_idx
  on public.medication_responses (entry_id)
  where deleted_at is null;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  user_id uuid not null references public.profiles(id),
  title text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'blocked', 'done', 'cancelled')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  due_at timestamptz,
  notes text,
  appointment_id uuid references public.appointments(id) on delete set null,
  decision_id uuid references public.decisions(id) on delete set null,
  diagnosis_id uuid references public.diagnoses(id) on delete set null,
  source_id uuid references public.sources(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists tasks_family_status_idx
  on public.tasks (family_id, status, due_at)
  where deleted_at is null;

create index if not exists tasks_linked_idx
  on public.tasks (appointment_id, decision_id, diagnosis_id, source_id)
  where deleted_at is null;

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_family_created_idx
  on public.audit_log (family_id, created_at desc);

create index if not exists audit_log_entity_idx
  on public.audit_log (entity_type, entity_id);

create or replace function public.current_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.family_id
  from public.profiles p
  where p.id = auth.uid()
    and p.deleted_at is null
  limit 1;
$$;

create or replace function public.app_role_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select r.slug
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.id = auth.uid()
    and p.deleted_at is null
    and r.deleted_at is null
  limit 1;
$$;

create or replace function public.can_write_family(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_family_id = public.current_family_id()
    and public.app_role_name() in ('primary', 'caregiver');
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_role_id uuid;
  requested_family_id uuid;
begin
  select id into default_role_id
  from public.roles
  where slug = coalesce(new.raw_user_meta_data ->> 'role', 'viewer')
  limit 1;

  requested_family_id := nullif(new.raw_user_meta_data ->> 'family_id', '')::uuid;

  insert into public.profiles (
    id,
    family_id,
    email,
    display_name,
    role_id,
    mfa_enabled
  )
  values (
    new.id,
    coalesce(requested_family_id, gen_random_uuid()),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email),
    default_role_id,
    false
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = excluded.display_name,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  action_name text;
  target_family_id uuid;
  target_entity_id uuid;
begin
  if tg_op = 'INSERT' then
    action_name := 'create';
    target_family_id := new.family_id;
    target_entity_id := new.id;
  elsif tg_op = 'UPDATE' then
    if old.deleted_at is null and new.deleted_at is not null then
      action_name := 'soft_delete';
    else
      action_name := 'update';
    end if;
    target_family_id := new.family_id;
    target_entity_id := new.id;
  else
    action_name := lower(tg_op);
    target_family_id := old.family_id;
    target_entity_id := old.id;
  end if;

  insert into public.audit_log (
    family_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    before,
    after
  )
  values (
    target_family_id,
    auth.uid(),
    action_name,
    tg_table_name,
    target_entity_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
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
    'appointments',
    'medications',
    'medication_responses',
    'sources',
    'tasks'
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

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'roles',
    'body_regions',
    'symptoms',
    'triggers'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'drop policy if exists %I on public.%I',
      table_name || '_select_authenticated',
      table_name
    );
    execute format(
      'create policy %I on public.%I for select to authenticated using (deleted_at is null)',
      table_name || '_select_authenticated',
      table_name
    );
  end loop;
end;
$$;

alter table public.profiles enable row level security;

drop policy if exists profiles_select_family on public.profiles;
create policy profiles_select_family
  on public.profiles
  for select
  to authenticated
  using (family_id = public.current_family_id() and deleted_at is null);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid() and deleted_at is null)
  with check (id = auth.uid() and family_id = public.current_family_id());

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
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
    'appointments',
    'medications',
    'medication_responses',
    'tasks'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);

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

alter table public.audit_log enable row level security;

drop policy if exists audit_log_select_family on public.audit_log;
create policy audit_log_select_family
  on public.audit_log
  for select
  to authenticated
  using (family_id = public.current_family_id());

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant usage on schema public to authenticated;

grant select on table
  public.roles,
  public.body_regions,
  public.symptoms,
  public.triggers,
  public.profiles,
  public.audit_log
to authenticated;

grant select, insert, update on table
  public.entries,
  public.entry_regions,
  public.entry_symptoms,
  public.entry_triggers,
  public.flare_checkpoints,
  public.attachments,
  public.vasomotor_measurements,
  public.sources,
  public.events,
  public.attachment_links,
  public.diagnoses,
  public.evidence_links,
  public.decisions,
  public.appointments,
  public.medications,
  public.medication_responses,
  public.tasks
to authenticated;

grant execute on function public.soft_delete_record(text, uuid) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'roles',
    'profiles',
    'body_regions',
    'symptoms',
    'triggers',
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
    'appointments',
    'medications',
    'medication_responses',
    'tasks'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_set_updated_at', table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute procedure public.set_updated_at()',
      table_name || '_set_updated_at',
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
    'decisions',
    'diagnoses',
    'evidence_links',
    'sources',
    'medications',
    'medication_responses',
    'appointments',
    'tasks',
    'events',
    'entries',
    'attachments',
    'attachment_links',
    'vasomotor_measurements'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_audit_row_change', table_name);
    execute format(
      'create trigger %I after insert or update on public.%I for each row execute procedure public.audit_row_change()',
      table_name || '_audit_row_change',
      table_name
    );
  end loop;
end;
$$;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'bella-private-uploads',
  'bella-private-uploads',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/quicktime',
    'application/pdf',
    'text/plain',
    'text/markdown'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "bella private upload read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'bella-private-uploads'
    and (storage.foldername(name))[1] = public.current_family_id()::text
  );

create policy "bella private upload create"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'bella-private-uploads'
    and (storage.foldername(name))[1] = public.current_family_id()::text
    and public.app_role_name() in ('primary', 'caregiver')
  );

create policy "bella private upload update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'bella-private-uploads'
    and (storage.foldername(name))[1] = public.current_family_id()::text
    and public.app_role_name() in ('primary', 'caregiver')
  )
  with check (
    bucket_id = 'bella-private-uploads'
    and (storage.foldername(name))[1] = public.current_family_id()::text
    and public.app_role_name() in ('primary', 'caregiver')
  );

create policy "bella private upload delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'bella-private-uploads'
    and (storage.foldername(name))[1] = public.current_family_id()::text
    and public.app_role_name() in ('primary', 'caregiver')
  );
