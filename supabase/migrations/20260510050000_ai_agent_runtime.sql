-- Multi-turn AI agent runtime.
-- The agent may read family-scoped records and create/update/reject drafts.
-- It must not directly commit medical records.

create table if not exists public.ai_agent_threads (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  user_id uuid not null references public.profiles(id),
  source_id uuid references public.sources(id) on delete set null,
  title text,
  mode text not null default 'agent' check (mode in ('agent', 'copilot', 'review')),
  status text not null default 'active' check (status in ('active', 'archived', 'failed')),
  model text,
  system_prompt_version text not null default 'ai-agent-v1',
  last_message_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists ai_agent_threads_family_updated_idx
  on public.ai_agent_threads (family_id, updated_at desc)
  where deleted_at is null;

create index if not exists ai_agent_threads_family_status_idx
  on public.ai_agent_threads (family_id, status, updated_at desc)
  where deleted_at is null;

create index if not exists ai_agent_threads_user_updated_idx
  on public.ai_agent_threads (user_id, updated_at desc)
  where deleted_at is null;

create table if not exists public.ai_agent_messages (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  user_id uuid references public.profiles(id),
  thread_id uuid not null references public.ai_agent_threads(id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant', 'tool')),
  content text not null default '',
  content_json jsonb not null default '{}'::jsonb,
  status text not null default 'complete' check (status in ('pending', 'streaming', 'complete', 'failed')),
  model text,
  response_id text,
  token_input integer check (token_input is null or token_input >= 0),
  token_output integer check (token_output is null or token_output >= 0),
  parent_message_id uuid references public.ai_agent_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists ai_agent_messages_thread_created_idx
  on public.ai_agent_messages (thread_id, created_at)
  where deleted_at is null;

create index if not exists ai_agent_messages_family_created_idx
  on public.ai_agent_messages (family_id, created_at desc)
  where deleted_at is null;

create index if not exists ai_agent_messages_parent_idx
  on public.ai_agent_messages (parent_message_id)
  where deleted_at is null;

create table if not exists public.ai_agent_tool_calls (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  user_id uuid references public.profiles(id),
  thread_id uuid not null references public.ai_agent_threads(id) on delete cascade,
  message_id uuid references public.ai_agent_messages(id) on delete cascade,
  tool_name text not null,
  tool_call_id text,
  status text not null default 'pending' check (status in ('pending', 'running', 'succeeded', 'failed', 'cancelled')),
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists ai_agent_tool_calls_thread_created_idx
  on public.ai_agent_tool_calls (thread_id, created_at)
  where deleted_at is null;

create index if not exists ai_agent_tool_calls_message_created_idx
  on public.ai_agent_tool_calls (message_id, created_at)
  where deleted_at is null;

create index if not exists ai_agent_tool_calls_family_status_idx
  on public.ai_agent_tool_calls (family_id, status, created_at desc)
  where deleted_at is null;

create index if not exists ai_agent_tool_calls_call_id_idx
  on public.ai_agent_tool_calls (tool_call_id)
  where deleted_at is null;

create table if not exists public.ai_agent_context_snapshots (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  user_id uuid references public.profiles(id),
  thread_id uuid not null references public.ai_agent_threads(id) on delete cascade,
  message_id uuid references public.ai_agent_messages(id) on delete set null,
  snapshot_type text not null check (snapshot_type in ('retrieval', 'pre_tool', 'post_tool', 'handoff', 'summary')),
  context jsonb not null default '{}'::jsonb,
  source_refs jsonb not null default '[]'::jsonb,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists ai_agent_context_snapshots_thread_created_idx
  on public.ai_agent_context_snapshots (thread_id, created_at desc)
  where deleted_at is null;

create index if not exists ai_agent_context_snapshots_message_idx
  on public.ai_agent_context_snapshots (message_id)
  where deleted_at is null;

create index if not exists ai_agent_context_snapshots_family_type_idx
  on public.ai_agent_context_snapshots (family_id, snapshot_type, created_at desc)
  where deleted_at is null;

alter table public.ai_import_sessions
  add column if not exists agent_thread_id uuid references public.ai_agent_threads(id) on delete set null;

alter table public.ai_import_drafts
  add column if not exists agent_thread_id uuid references public.ai_agent_threads(id) on delete set null;

create index if not exists ai_import_sessions_agent_thread_idx
  on public.ai_import_sessions (agent_thread_id)
  where deleted_at is null;

create index if not exists ai_import_drafts_agent_thread_idx
  on public.ai_import_drafts (agent_thread_id)
  where deleted_at is null;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'ai_agent_threads',
    'ai_agent_messages',
    'ai_agent_tool_calls',
    'ai_agent_context_snapshots'
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

grant select, insert, update on table
  public.ai_agent_threads,
  public.ai_agent_messages,
  public.ai_agent_tool_calls,
  public.ai_agent_context_snapshots
to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'ai_agent_threads',
    'ai_agent_messages',
    'ai_agent_tool_calls',
    'ai_agent_context_snapshots'
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
    'ai_agent_context_snapshots'
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
    'ai_agent_context_snapshots'
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
