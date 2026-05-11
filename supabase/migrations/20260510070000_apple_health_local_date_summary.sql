-- Group Apple Health daily summaries by the Apple *local* date when the
-- parser has tagged it on the sample (`metadata->>'local_date'` written by
-- `appleLocalDate()` in src/server/services/apple-health.ts). Falls back to
-- the UTC date when the local date is missing or malformed, so legacy rows
-- imported before the parser change still summarize.
--
-- Without this fix, a sleep record starting at 23:00 Pacific would summarize
-- under the *next* day in UTC (06:00 the following morning), which is the
-- wrong day for an Apple Health user thinking in local time.

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
      coalesce(
        case
          when s.metadata ? 'local_date'
            and (s.metadata->>'local_date') ~ '^\d{4}-\d{2}-\d{2}$'
            then (s.metadata->>'local_date')::date
          else null
        end,
        (s.start_at at time zone 'UTC')::date
      ) as summary_date,
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
      and coalesce(
        case
          when s.metadata ? 'local_date'
            and (s.metadata->>'local_date') ~ '^\d{4}-\d{2}-\d{2}$'
            then (s.metadata->>'local_date')::date
          else null
        end,
        (s.start_at at time zone 'UTC')::date
      ) between start_date and end_date
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
    jsonb_build_object(
      'generated_by', 'refresh_apple_health_daily_summaries',
      'day_basis', 'apple_local_date_with_utc_fallback'
    )
  from normalized
  where aggregate_value is not null
  group by family_id, summary_date, metric_type;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

grant execute on function public.refresh_apple_health_daily_summaries(date, date)
to authenticated;
