-- Release follow-up backend contract gaps.

alter table public.audit_log
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create or replace function public.record_soft_delete_reason(
  target_entity_type text,
  target_entity_id uuid,
  delete_reason text
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
    raise exception 'insufficient role for soft-delete audit';
  end if;

  if nullif(trim(delete_reason), '') is null then
    raise exception 'soft delete reason is required';
  end if;

  insert into public.audit_log (
    family_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target_family_id,
    auth.uid(),
    'soft_delete_reason',
    target_entity_type,
    target_entity_id,
    jsonb_build_object('reason', trim(delete_reason))
  );
end;
$$;

grant execute on function public.record_soft_delete_reason(text, uuid, text)
to authenticated;
