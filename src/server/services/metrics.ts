import type { SupabaseClient } from "@supabase/supabase-js";
import {
  dashboardMetricsSchema,
  metricsFilterSchema,
  type DashboardMetrics,
  type MetricsFilter,
} from "@/server/contracts";
import { requireCurrentProfile } from "./auth";

type Row = Record<string, unknown>;

export type MetricsSourceRows = {
  entries?: Row[];
  entry_regions?: Row[];
  entry_triggers?: Row[];
  medication_responses?: Row[];
  vasomotor_measurements?: Row[];
  appointments?: Row[];
  tasks?: Row[];
  decisions?: Row[];
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return null;
}

function toDate(value: unknown): Date {
  return new Date(String(value));
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function weekStart(dateValue: unknown): string {
  const date = toDate(dateValue);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  date.setUTCHours(0, 0, 0, 0);
  return isoDate(date);
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return (
    Math.round(
      (values.reduce((sum, value) => sum + value, 0) / values.length) * 100,
    ) / 100
  );
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return Math.round(((sorted[middle - 1] + sorted[middle]) / 2) * 100) / 100;
}

function inRange(row: Row, column: string, filter: MetricsFilter) {
  const value = String(row[column] ?? "");
  if (!value) return true;
  if (filter.date_from && value < filter.date_from) return false;
  if (filter.date_to && value > filter.date_to) return false;
  return true;
}

export function buildDashboardMetrics(
  rows: MetricsSourceRows,
  input: MetricsFilter = {},
  generatedAt = new Date().toISOString(),
): DashboardMetrics {
  const parsed = metricsFilterSchema.parse(input);
  const entries = (rows.entries ?? []).filter((row) =>
    inRange(row, "occurred_at", parsed),
  );
  const entryIds = new Set(entries.map((row) => String(row.id)));

  const flareEntries = entries.filter(
    (row) => row.is_flare === true || row.type === "flare",
  );
  const flaresByWeek = new Map<string, number>();

  for (const row of flareEntries) {
    const key = weekStart(row.occurred_at);
    flaresByWeek.set(key, (flaresByWeek.get(key) ?? 0) + 1);
  }

  const recoveryMinutes = flareEntries
    .map((row) => toNumber(row.recovery_minutes))
    .filter((value): value is number => value !== null);

  const regions = new Map<
    string,
    { count: number; peak: number[]; current: number[] }
  >();

  for (const link of rows.entry_regions ?? []) {
    const entryId = String(link.entry_id);
    if (!entryIds.has(entryId)) continue;
    const entry = entries.find((row) => String(row.id) === entryId);
    if (!entry) continue;
    const regionId = String(link.body_region_id);
    const bucket = regions.get(regionId) ?? { count: 0, peak: [], current: [] };
    bucket.count += 1;
    const peak = toNumber(entry.pain_peak);
    const current = toNumber(entry.pain_current);
    if (peak !== null) bucket.peak.push(peak);
    if (current !== null) bucket.current.push(current);
    regions.set(regionId, bucket);
  }

  const triggers = new Map<string, number>();
  for (const link of rows.entry_triggers ?? []) {
    if (!entryIds.has(String(link.entry_id))) continue;
    const triggerId = String(link.trigger_id);
    triggers.set(triggerId, (triggers.get(triggerId) ?? 0) + 1);
  }

  const medResponses = (rows.medication_responses ?? []).filter((row) =>
    inRange(row, "taken_at", parsed),
  );
  const medBuckets = new Map<
    string,
    {
      medication_id: string | null;
      count: number;
      helped: number;
      unclear: number;
      worsened: number;
      painDeltas: number[];
    }
  >();

  for (const row of medResponses) {
    const medicationId = row.medication_id ? String(row.medication_id) : null;
    const key = medicationId ?? "unlinked";
    const bucket = medBuckets.get(key) ?? {
      medication_id: medicationId,
      count: 0,
      helped: 0,
      unclear: 0,
      worsened: 0,
      painDeltas: [],
    };
    bucket.count += 1;
    if (row.helped === "helped") bucket.helped += 1;
    if (row.helped === "unclear") bucket.unclear += 1;
    if (row.helped === "worsened") bucket.worsened += 1;
    const before = toNumber(row.pain_before);
    const after = toNumber(row.pain_after_120m);
    if (before !== null && after !== null)
      bucket.painDeltas.push(after - before);
    medBuckets.set(key, bucket);
  }

  const now = generatedAt;

  return dashboardMetricsSchema.parse({
    generated_at: generatedAt,
    flares_per_week: [...flaresByWeek.entries()]
      .map(([week_start, flare_count]) => ({ week_start, flare_count }))
      .sort((a, b) => a.week_start.localeCompare(b.week_start)),
    recovery: {
      flare_count: flareEntries.length,
      average_recovery_minutes: average(recoveryMinutes),
      median_recovery_minutes: median(recoveryMinutes),
    },
    pain_by_body_region: [...regions.entries()].map(
      ([body_region_id, bucket]) => ({
        body_region_id,
        entry_count: bucket.count,
        average_pain_peak: average(bucket.peak),
        average_pain_current: average(bucket.current),
      }),
    ),
    trigger_frequency: [...triggers.entries()]
      .map(([trigger_id, entry_count]) => ({ trigger_id, entry_count }))
      .sort((a, b) => b.entry_count - a.entry_count),
    medication_response_summary: [...medBuckets.values()].map((bucket) => ({
      medication_id: bucket.medication_id,
      response_count: bucket.count,
      helped_count: bucket.helped,
      unclear_count: bucket.unclear,
      worsened_count: bucket.worsened,
      average_pain_delta_120m: average(bucket.painDeltas),
    })),
    vasomotor_deltas_over_time: (rows.vasomotor_measurements ?? [])
      .filter((row) => inRange(row, "measured_at", parsed))
      .map((row) => ({
        measured_at: String(row.measured_at),
        site: String(row.site),
        delta_c: toNumber(row.delta_c),
        context: String(row.context),
      }))
      .sort((a, b) => a.measured_at.localeCompare(b.measured_at)),
    upcoming_appointments_count: (rows.appointments ?? []).filter(
      (row) =>
        String(row.date_time ?? "") >= now &&
        row.status !== "cancelled" &&
        row.deleted_at === null,
    ).length,
    open_tasks_count: (rows.tasks ?? []).filter((row) =>
      ["open", "in_progress", "blocked"].includes(String(row.status)),
    ).length,
    open_decisions_count: (rows.decisions ?? []).filter((row) =>
      [
        "open",
        "waiting_on_test",
        "waiting_on_clinician",
        "revisiting",
      ].includes(String(row.status)),
    ).length,
  });
}

async function selectRows(supabase: SupabaseClient, tableName: string) {
  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .is("deleted_at", null)
    .limit(1000);

  if (error) throw error;
  return (data ?? []) as Row[];
}

export async function getDashboardMetrics(
  input: MetricsFilter,
  supabase: SupabaseClient,
): Promise<DashboardMetrics> {
  metricsFilterSchema.parse(input);
  await requireCurrentProfile(supabase);

  const [
    entries,
    entryRegions,
    entryTriggers,
    medicationResponses,
    vasomotorMeasurements,
    appointments,
    tasks,
    decisions,
  ] = await Promise.all([
    selectRows(supabase, "entries"),
    selectRows(supabase, "entry_regions"),
    selectRows(supabase, "entry_triggers"),
    selectRows(supabase, "medication_responses"),
    selectRows(supabase, "vasomotor_measurements"),
    selectRows(supabase, "appointments"),
    selectRows(supabase, "tasks"),
    selectRows(supabase, "decisions"),
  ]);

  return buildDashboardMetrics(
    input
      ? {
          entries,
          entry_regions: entryRegions,
          entry_triggers: entryTriggers,
          medication_responses: medicationResponses,
          vasomotor_measurements: vasomotorMeasurements,
          appointments,
          tasks,
          decisions,
        }
      : {},
    input,
  );
}
