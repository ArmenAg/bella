-- Backend Phase 2 additive schema for decision-level evidence links.

create table if not exists public.decision_evidence_links (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  decision_id uuid not null references public.decisions(id) on delete cascade,
  linked_type text not null check (
    linked_type in (
      'entry',
      'event',
      'attachment',
      'source',
      'diagnosis',
      'vasomotor_measurement'
    )
  ),
  linked_id uuid not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (decision_id, linked_type, linked_id)
);

create index if not exists decision_evidence_links_decision_idx
  on public.decision_evidence_links (decision_id, linked_type)
  where deleted_at is null;

create index if not exists decision_evidence_links_target_idx
  on public.decision_evidence_links (family_id, linked_type, linked_id)
  where deleted_at is null;

alter table public.decision_evidence_links enable row level security;

drop policy if exists decision_evidence_links_select_family
  on public.decision_evidence_links;
create policy decision_evidence_links_select_family
  on public.decision_evidence_links
  for select
  to authenticated
  using (family_id = public.current_family_id() and deleted_at is null);

drop policy if exists decision_evidence_links_insert_writable_family
  on public.decision_evidence_links;
create policy decision_evidence_links_insert_writable_family
  on public.decision_evidence_links
  for insert
  to authenticated
  with check (public.can_write_family(family_id));

drop policy if exists decision_evidence_links_update_writable_family
  on public.decision_evidence_links;
create policy decision_evidence_links_update_writable_family
  on public.decision_evidence_links
  for update
  to authenticated
  using (public.can_write_family(family_id) and deleted_at is null)
  with check (public.can_write_family(family_id));

grant select, insert, update on table public.decision_evidence_links
to authenticated;

drop trigger if exists decision_evidence_links_set_updated_at
  on public.decision_evidence_links;
create trigger decision_evidence_links_set_updated_at
  before update on public.decision_evidence_links
  for each row execute procedure public.set_updated_at();

drop trigger if exists decision_evidence_links_audit_row_change
  on public.decision_evidence_links;
create trigger decision_evidence_links_audit_row_change
  after insert or update on public.decision_evidence_links
  for each row execute procedure public.audit_row_change();

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

grant execute on function public.soft_delete_record(text, uuid) to authenticated;

create or replace function public.record_diagnostic_action(
  action_name text,
  target_entity_type text,
  target_entity_id uuid,
  before_state jsonb default null,
  after_state jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_family_id uuid;
begin
  target_family_id := public.current_family_id();

  if target_family_id is null then
    raise exception 'Authentication required';
  end if;

  if public.app_role_name() not in ('primary', 'caregiver') then
    raise exception 'insufficient role for diagnostic audit';
  end if;

  if action_name not in ('merge', 'split') then
    raise exception 'unsupported diagnostic action %', action_name;
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
    target_entity_type,
    target_entity_id,
    before_state,
    after_state
  );
end;
$$;

grant execute on function public.record_diagnostic_action(text, text, uuid, jsonb, jsonb)
to authenticated;
