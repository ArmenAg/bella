-- Backend Phase 3 export helper.
-- Returns family-scoped JSON data for manifest-first bulk export.

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
    'tasks'
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
