-- RLS and storage verification for the Bella Care Tracker foundation.
-- Run after migrations and reference/demo seeds:
--
--   npm run supabase:verify
--
-- The script intentionally uses deterministic fake users and families. It
-- impersonates Supabase authenticated users by setting request JWT claims.

begin;

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

create or replace function public.assert_condition(
  condition boolean,
  message text
)
returns void
language plpgsql
as $$
begin
  if not condition then
    raise exception 'RLS verification failed: %', message;
  end if;
end;
$$;

select public.assert_condition(
  not exists (
    select 1
    from pg_tables t
    where t.schemaname = 'public'
      and t.tablename in (
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
        'audit_log'
      )
      and not exists (
        select 1
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = t.schemaname
          and c.relname = t.tablename
          and c.relrowsecurity
      )
  ),
  'every foundation table must have RLS enabled'
);

select public.assert_condition(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and 'anon' = any(roles)
  ),
  'public tables must not grant anon policies'
);

select public.assert_condition(
  not has_table_privilege('anon', 'public.entries', 'select')
    and not has_table_privilege('anon', 'public.entries', 'insert')
    and not has_table_privilege('anon', 'public.attachments', 'select')
    and not has_table_privilege('anon', 'public.diagnoses', 'select'),
  'anon role must not have table privileges'
);

select public.assert_condition(
  exists (
    select 1
    from storage.buckets
    where id = 'bella-private-uploads'
      and public = false
      and file_size_limit = 524288000
  ),
  'private upload bucket must be private with 500 MB size limit'
);

do $$
declare
  family_a uuid := uuid_generate_v5(uuid_ns_url(), 'bella-rls-test:family-a');
  family_b uuid := uuid_generate_v5(uuid_ns_url(), 'bella-rls-test:family-b');
  primary_a uuid := uuid_generate_v5(uuid_ns_url(), 'bella-rls-test:primary-a');
  caregiver_a uuid := uuid_generate_v5(uuid_ns_url(), 'bella-rls-test:caregiver-a');
  viewer_a uuid := uuid_generate_v5(uuid_ns_url(), 'bella-rls-test:viewer-a');
  clinician_a uuid := uuid_generate_v5(uuid_ns_url(), 'bella-rls-test:clinician-a');
  primary_b uuid := uuid_generate_v5(uuid_ns_url(), 'bella-rls-test:primary-b');
begin
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values
    (
      primary_a,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'rls-primary-a@example.test',
      crypt('local-password', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    ),
    (
      caregiver_a,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'rls-caregiver-a@example.test',
      crypt('local-password', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    ),
    (
      viewer_a,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'rls-viewer-a@example.test',
      crypt('local-password', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    ),
    (
      clinician_a,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'rls-clinician-a@example.test',
      crypt('local-password', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    ),
    (
      primary_b,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'rls-primary-b@example.test',
      crypt('local-password', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    )
  on conflict (id) do nothing;

  insert into public.profiles (id, family_id, email, display_name, role_id)
  values
    (primary_a, family_a, 'rls-primary-a@example.test', 'RLS Primary A', (select id from public.roles where slug = 'primary')),
    (caregiver_a, family_a, 'rls-caregiver-a@example.test', 'RLS Caregiver A', (select id from public.roles where slug = 'caregiver')),
    (viewer_a, family_a, 'rls-viewer-a@example.test', 'RLS Viewer A', (select id from public.roles where slug = 'viewer')),
    (clinician_a, family_a, 'rls-clinician-a@example.test', 'RLS Clinician A', (select id from public.roles where slug = 'clinician_readonly')),
    (primary_b, family_b, 'rls-primary-b@example.test', 'RLS Primary B', (select id from public.roles where slug = 'primary'))
  on conflict (id) do update
  set
    family_id = excluded.family_id,
    role_id = excluded.role_id,
    deleted_at = null,
    updated_at = now();

  insert into public.entries (
    id,
    family_id,
    user_id,
    created_by,
    type,
    occurred_at,
    title,
    is_flare
  )
  values
    (
      uuid_generate_v5(uuid_ns_url(), 'bella-rls-test:entry-family-a'),
      family_a,
      primary_a,
      primary_a,
      'baseline',
      '2026-05-10 00:00:00+00',
      'RLS family A visible entry',
      false
    ),
    (
      uuid_generate_v5(uuid_ns_url(), 'bella-rls-test:entry-family-b'),
      family_b,
      primary_b,
      primary_b,
      'baseline',
      '2026-05-10 00:00:00+00',
      'RLS family B hidden entry',
      false
    ),
    (
      uuid_generate_v5(uuid_ns_url(), 'bella-rls-test:entry-family-a-deleted'),
      family_a,
      primary_a,
      primary_a,
      'baseline',
      '2026-05-10 01:00:00+00',
      'RLS soft deleted entry',
      false
    )
  on conflict (id) do update
  set
    family_id = excluded.family_id,
    deleted_at = null,
    updated_at = now();

  update public.entries
  set deleted_at = now()
  where id = uuid_generate_v5(uuid_ns_url(), 'bella-rls-test:entry-family-a-deleted');
end;
$$;

set local role authenticated;
set local request.jwt.claim.sub = '8ef16bfb-593d-52d2-9b02-670d016fa4a8';

-- The deterministic UUID above is uuid_generate_v5(uuid_ns_url(),
-- 'bella-rls-test:primary-a'). Recompute in a query to avoid relying on the
-- comment if this file is edited later.
reset role;

do $$
declare
  primary_a uuid := uuid_generate_v5(uuid_ns_url(), 'bella-rls-test:primary-a');
  caregiver_a uuid := uuid_generate_v5(uuid_ns_url(), 'bella-rls-test:caregiver-a');
  viewer_a uuid := uuid_generate_v5(uuid_ns_url(), 'bella-rls-test:viewer-a');
  clinician_a uuid := uuid_generate_v5(uuid_ns_url(), 'bella-rls-test:clinician-a');
  family_a uuid := uuid_generate_v5(uuid_ns_url(), 'bella-rls-test:family-a');
  family_b uuid := uuid_generate_v5(uuid_ns_url(), 'bella-rls-test:family-b');
  inserted_id uuid;
  agent_thread_id uuid;
  blocked boolean;
  affected_rows integer;
  visible_count integer;
  health_import_id uuid;
begin
  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub', primary_a::text, true);

  insert into public.entries (
    family_id,
    user_id,
    created_by,
    type,
    occurred_at,
    title,
    is_flare
  )
  values (
    family_a,
    primary_a,
    primary_a,
    'baseline',
    now(),
    'RLS primary insert allowed',
    false
  )
  returning id into inserted_id;

  insert into public.ai_agent_threads (
    family_id,
    user_id,
    title,
    status
  )
  values (
    family_a,
    primary_a,
    'RLS visible agent thread',
    'active'
  )
  returning id into agent_thread_id;

  insert into public.ai_agent_messages (
    family_id,
    user_id,
    thread_id,
    role,
    content
  )
  values (
    family_a,
    primary_a,
    agent_thread_id,
    'user',
    'RLS visible agent message'
  );

  insert into public.ai_agent_tool_calls (
    family_id,
    user_id,
    thread_id,
    tool_name,
    status,
    input
  )
  values (
    family_a,
    primary_a,
    agent_thread_id,
    'get_case_snapshot',
    'succeeded',
    '{}'::jsonb
  );

  insert into public.ai_agent_context_snapshots (
    family_id,
    user_id,
    thread_id,
    snapshot_type,
    context
  )
  values (
    family_a,
    primary_a,
    agent_thread_id,
    'summary',
    '{"rls":"visible"}'::jsonb
  );

  insert into public.apple_health_imports (
    family_id,
    user_id,
    status,
    file_name
  )
  values (
    family_a,
    primary_a,
    'completed',
    'rls-export.zip'
  )
  returning id into health_import_id;

  insert into public.apple_health_samples (
    family_id,
    user_id,
    import_id,
    external_key,
    apple_type,
    normalized_type,
    sample_kind,
    unit,
    value_numeric,
    start_at,
    end_at
  )
  values (
    family_a,
    primary_a,
    health_import_id,
    'rls-health-sample-a',
    'HKQuantityTypeIdentifierStepCount',
    'step_count',
    'quantity',
    'count',
    42,
    now(),
    now()
  );

  insert into public.apple_health_daily_summaries (
    family_id,
    summary_date,
    metric_type,
    unit,
    sample_count,
    value_sum
  )
  values (
    family_a,
    current_date,
    'step_count',
    'count',
    1,
    42
  );

  select count(*) into visible_count
  from public.entries
  where family_id = family_b;

  perform public.assert_condition(
    visible_count = 0,
    'primary must not read another family entries'
  );

  select count(*) into visible_count
  from public.ai_agent_threads
  where family_id = family_b;

  perform public.assert_condition(
    visible_count = 0,
    'primary must not read another family agent threads'
  );

  select count(*) into visible_count
  from public.apple_health_imports
  where family_id = family_b;

  perform public.assert_condition(
    visible_count = 0,
    'primary must not read another family Apple Health imports'
  );

  select count(*) into visible_count
  from public.entries
  where deleted_at is not null;

  perform public.assert_condition(
    visible_count = 0,
    'soft-deleted rows must be hidden by normal RLS reads'
  );

  perform set_config('request.jwt.claim.sub', caregiver_a::text, true);

  insert into public.entries (
    family_id,
    user_id,
    created_by,
    type,
    occurred_at,
    title,
    is_flare
  )
  values (
    family_a,
    caregiver_a,
    caregiver_a,
    'freeform',
    now(),
    'RLS caregiver insert allowed',
    false
  );

  perform set_config('request.jwt.claim.sub', viewer_a::text, true);
  blocked := false;

  begin
    insert into public.entries (
      family_id,
      user_id,
      created_by,
      type,
      occurred_at,
      title,
      is_flare
    )
    values (
      family_a,
      viewer_a,
      viewer_a,
      'freeform',
      now(),
      'RLS viewer insert must fail',
      false
    );
  exception when insufficient_privilege or check_violation or with_check_option_violation then
    blocked := true;
  end;

  perform public.assert_condition(
    blocked,
    'viewer role must be read-only'
  );

  blocked := false;

  begin
    insert into public.ai_agent_threads (
      family_id,
      user_id,
      title,
      status
    )
    values (
      family_a,
      viewer_a,
      'RLS viewer agent insert must fail',
      'active'
    );
  exception when insufficient_privilege or check_violation or with_check_option_violation then
    blocked := true;
  end;

  perform public.assert_condition(
    blocked,
    'viewer role must not create agent threads'
  );

  blocked := false;

  begin
    insert into public.apple_health_imports (
      family_id,
      user_id,
      status,
      file_name
    )
    values (
      family_a,
      viewer_a,
      'processing',
      'RLS viewer Apple Health import must fail'
    );
  exception when insufficient_privilege or check_violation or with_check_option_violation then
    blocked := true;
  end;

  perform public.assert_condition(
    blocked,
    'viewer role must not create Apple Health imports'
  );

  perform set_config('request.jwt.claim.sub', clinician_a::text, true);
  update public.entries
  set notes = 'clinician update must not change rows'
  where family_id = family_a;

  get diagnostics affected_rows = row_count;

  perform public.assert_condition(
    affected_rows = 0,
    'clinician_readonly role must be read-only'
  );

  update public.ai_agent_threads
  set title = 'clinician update must not change rows'
  where family_id = family_a;

  get diagnostics affected_rows = row_count;

  perform public.assert_condition(
    affected_rows = 0,
    'clinician_readonly role must not update agent threads'
  );

  update public.apple_health_imports
  set file_name = 'clinician update must not change rows'
  where family_id = family_a;

  get diagnostics affected_rows = row_count;

  perform public.assert_condition(
    affected_rows = 0,
    'clinician_readonly role must not update Apple Health imports'
  );

  reset role;
end;
$$;

rollback;
