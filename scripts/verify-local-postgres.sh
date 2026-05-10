#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PG_BIN="${PG_BIN:-}"
PG_PORT="${PG_PORT:-55432}"

if [[ -z "$PG_BIN" ]]; then
  if command -v postgres >/dev/null 2>&1; then
    PG_BIN="$(dirname "$(command -v postgres)")"
  elif [[ -x "/opt/homebrew/opt/postgresql@15/bin/postgres" ]]; then
    PG_BIN="/opt/homebrew/opt/postgresql@15/bin"
  elif [[ -x "/usr/local/opt/postgresql@15/bin/postgres" ]]; then
    PG_BIN="/usr/local/opt/postgresql@15/bin"
  else
    echo "PostgreSQL 15 binaries not found. Set PG_BIN=/path/to/postgres/bin." >&2
    exit 1
  fi
fi

TMP_PG="$(mktemp -d /tmp/bella-pg.XXXXXX)"

cleanup() {
  "$PG_BIN/pg_ctl" -D "$TMP_PG/data" stop -m fast >/dev/null 2>&1 || true
  rm -rf "$TMP_PG"
}
trap cleanup EXIT

"$PG_BIN/initdb" -D "$TMP_PG/data" --no-locale --encoding=UTF8 >/dev/null
"$PG_BIN/pg_ctl" \
  -D "$TMP_PG/data" \
  -o "-p $PG_PORT -k $TMP_PG" \
  -l "$TMP_PG/postgres.log" \
  start >/dev/null

psql_tmp() {
  PGOPTIONS="-c client_min_messages=warning" \
    "$PG_BIN/psql" -v ON_ERROR_STOP=1 -q -p "$PG_PORT" -h "$TMP_PG" -d postgres "$@"
}

psql_tmp <<'SQL'
create role anon nologin;
create role authenticated nologin;

create schema auth;
create table auth.users (
  id uuid primary key,
  instance_id uuid,
  aud varchar(255),
  role varchar(255),
  email varchar(255),
  encrypted_password text,
  email_confirmed_at timestamptz,
  invited_at timestamptz,
  confirmation_token varchar(255),
  confirmation_sent_at timestamptz,
  recovery_token varchar(255),
  recovery_sent_at timestamptz,
  email_change_token_new varchar(255),
  email_change varchar(255),
  email_change_sent_at timestamptz,
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  is_super_admin boolean,
  created_at timestamptz,
  updated_at timestamptz,
  phone text,
  phone_confirmed_at timestamptz,
  phone_change text,
  phone_change_token text,
  phone_change_sent_at timestamptz,
  email_change_token_current text,
  email_change_confirm_status smallint,
  banned_until timestamptz,
  reauthentication_token text,
  reauthentication_sent_at timestamptz,
  is_sso_user boolean default false,
  deleted_at timestamptz
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  owner uuid,
  public boolean not null default false,
  avif_autodetection boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets(id),
  name text not null,
  owner uuid,
  metadata jsonb,
  path_tokens text[] generated always as (string_to_array(name, '/')) stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_accessed_at timestamptz
);

alter table storage.objects enable row level security;

create or replace function storage.foldername(name text)
returns text[]
language sql
immutable
as $$
  select string_to_array(name, '/');
$$;

grant usage on schema auth, storage to anon, authenticated;
grant all on table auth.users to authenticated;
grant select on table storage.buckets to authenticated;
grant select, insert, update, delete on table storage.objects to authenticated;
SQL

for migration in "$ROOT_DIR"/supabase/migrations/*.sql; do
  psql_tmp -f "$migration" >/dev/null
done
psql_tmp -f "$ROOT_DIR/supabase/seed/001_reference.sql" >/dev/null
psql_tmp -f "$ROOT_DIR/supabase/seed/002_demo.sql" >/dev/null
psql_tmp -f "$ROOT_DIR/supabase/seed/003_diagnostic_tree.sql" >/dev/null
psql_tmp -f "$ROOT_DIR/supabase/seed/004_historical_import.sql" >/dev/null
psql_tmp -f "$ROOT_DIR/supabase/seed/005_current_records_bootstrap.sql" >/dev/null

# Run seeds a second time to prove idempotency.
psql_tmp -f "$ROOT_DIR/supabase/seed/001_reference.sql" >/dev/null
psql_tmp -f "$ROOT_DIR/supabase/seed/002_demo.sql" >/dev/null
psql_tmp -f "$ROOT_DIR/supabase/seed/003_diagnostic_tree.sql" >/dev/null
psql_tmp -f "$ROOT_DIR/supabase/seed/004_historical_import.sql" >/dev/null
psql_tmp -f "$ROOT_DIR/supabase/seed/005_current_records_bootstrap.sql" >/dev/null

psql_tmp -f "$ROOT_DIR/supabase/tests/rls_verification.sql" >/dev/null

echo "local-postgres-migration-seed-idempotency-rls-verify-ok"
