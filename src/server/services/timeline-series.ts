import type { SupabaseClient } from "@supabase/supabase-js";
import {
  timelineSeriesFilterSchema,
  timelineSeriesSchema,
  type ConsultMarker,
  type DecisionMarker,
  type DiagnosticMilestoneMarker,
  type FlareSessionMarker,
  type MedicationRange,
  type PainPoint,
  type TimelineEventMarker,
  type TimelineEventMarkerKind,
  type TimelineSeries,
  type TimelineSeriesFilter,
} from "@/server/contracts";
import { requireCurrentProfile } from "./auth";

type Row = Record<string, unknown>;

export const TIMELINE_SERIES_SOURCE_ROW_LIMIT = 1000;

const FIVE_YEARS_MS = 5 * 365 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const PROCEDURE_EVENT_KINDS = [
  "injury",
  "procedure",
  "imaging",
  "test_lab",
  "medication_change",
] as const satisfies readonly TimelineEventMarkerKind[];

function toIsoOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim() !== "") {
    return new Date(value).toISOString();
  }
  return null;
}

function toIso(value: unknown, fallback: string): string {
  return toIsoOrNull(value) ?? fallback;
}

function dateToIsoStartOfDay(value: unknown): string | null {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00:00.000Z`;
  }
  return toIsoOrNull(value);
}

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value);
  return str === "" ? null : str;
}

function toNullableBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined) return null;
  return Boolean(value);
}

function toNullablePainScore(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isProcedureKind(value: unknown): value is TimelineEventMarkerKind {
  return PROCEDURE_EVENT_KINDS.includes(value as TimelineEventMarkerKind);
}

async function selectInRange(
  supabase: SupabaseClient,
  table: string,
  dateColumn: string,
  fromIso: string,
  toIso: string,
): Promise<Row[]> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .is("deleted_at", null)
    .gte(dateColumn, fromIso)
    .lte(dateColumn, toIso)
    .order(dateColumn, { ascending: true })
    .limit(TIMELINE_SERIES_SOURCE_ROW_LIMIT);

  if (error) throw error;
  return (data ?? []) as Row[];
}

async function selectMedicationsOverlappingRange(
  supabase: SupabaseClient,
  fromIso: string,
  toIso: string,
): Promise<Row[]> {
  // A medication overlaps the [from, to] window if it stops on/after `from`
  // (or has no stop) and starts on/before `to` (or has no start). We can't
  // express "(stop_date is null OR stop_date >= from) AND ..." easily through
  // the basic builder, so fetch all non-deleted rows and filter in memory —
  // medications cardinality is small.
  const { data, error } = await supabase
    .from("medications")
    .select("*")
    .is("deleted_at", null)
    .order("start_date", { ascending: true, nullsFirst: false })
    .limit(TIMELINE_SERIES_SOURCE_ROW_LIMIT);

  if (error) throw error;

  const rows = (data ?? []) as Row[];
  const fromTs = Date.parse(fromIso);
  const toTs = Date.parse(toIso);

  return rows.filter((row) => {
    const startIso =
      dateToIsoStartOfDay(row.start_date) ?? toIsoOrNull(row.created_at);
    const endIso = dateToIsoStartOfDay(row.stop_date);

    const startTs = startIso ? Date.parse(startIso) : Number.NEGATIVE_INFINITY;
    const endTs = endIso ? Date.parse(endIso) : Number.POSITIVE_INFINITY;

    return endTs >= fromTs && startTs <= toTs;
  });
}

async function selectInjuryAnchor(
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("events")
    .select("occurred_at")
    .is("deleted_at", null)
    .eq("type", "injury")
    .order("occurred_at", { ascending: true })
    .limit(1);

  if (error) throw error;

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return null;
  return toIsoOrNull(rows[0].occurred_at);
}

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined;
}

function buildPainPoints(rows: Row[]): PainPoint[] {
  return rows
    .filter(
      (row) =>
        hasValue(row.pain_current) ||
        hasValue(row.pain_peak) ||
        hasValue(row.pain_average),
    )
    .map((row) => ({
      entry_id: String(row.id),
      occurred_at: toIso(row.occurred_at, new Date(0).toISOString()),
      pain_current: toNullablePainScore(row.pain_current),
      pain_peak: toNullablePainScore(row.pain_peak),
      pain_average: toNullablePainScore(row.pain_average),
      is_flare: Boolean(row.is_flare),
    }))
    .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
}

function buildFlareSessions(rows: Row[]): FlareSessionMarker[] {
  // No separate `flare_sessions` table exists in the schema; flares live in
  // `entries` rows where `is_flare = true` (or `type = 'flare'`). We surface
  // them here as session markers using occurred_at..ended_at.
  return rows
    .filter((row) => row.is_flare === true || row.type === "flare")
    .map((row) => ({
      id: String(row.id),
      start_at: toIso(row.occurred_at, new Date(0).toISOString()),
      ended_at: toIsoOrNull(row.ended_at),
      peak_pain: toNullablePainScore(row.pain_peak),
      title: String(row.title ?? "Flare"),
    }))
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
}

function buildMedicationRanges(rows: Row[]): MedicationRange[] {
  return rows
    .map((row) => {
      const startAt =
        dateToIsoStartOfDay(row.start_date) ?? toIsoOrNull(row.created_at);
      // Active meds with no stop_date are ongoing → end_at null. For other
      // statuses the absence of stop_date also surfaces as null since we have
      // nothing better to use; the visualization treats null as "ongoing".
      const endAt = dateToIsoStartOfDay(row.stop_date);
      return {
        id: String(row.id),
        name: String(row.name ?? "Medication"),
        dose: toNullableString(row.dose),
        start_at: startAt,
        end_at: endAt,
        status: (row.status as MedicationRange["status"]) ?? "active",
        helped_pain: toNullableBoolean(row.helped_pain),
      };
    })
    .sort((a, b) => {
      const aStart = a.start_at ?? "";
      const bStart = b.start_at ?? "";
      return aStart.localeCompare(bStart);
    });
}

function buildProcedureMarkers(rows: Row[]): TimelineEventMarker[] {
  return rows
    .filter((row) => isProcedureKind(row.type))
    .map((row) => ({
      id: String(row.id),
      occurred_at: toIso(row.occurred_at, new Date(0).toISOString()),
      ended_at: toIsoOrNull(row.ended_at),
      title: String(row.title ?? "Event"),
      summary: toNullableString(row.summary),
      kind: row.type as TimelineEventMarkerKind,
    }))
    .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
}

function buildConsultMarkers(
  appointmentRows: Row[],
  eventRows: Row[],
): ConsultMarker[] {
  const fromAppointments = appointmentRows.map<ConsultMarker>((row) => ({
    id: String(row.id),
    occurred_at: toIso(row.date_time, new Date(0).toISOString()),
    provider: toNullableString(row.provider),
    specialty: toNullableString(row.specialty),
    purpose: String(row.purpose ?? "Appointment"),
    summary: toNullableString(row.after_visit_summary),
  }));

  const fromEvents = eventRows
    .filter((row) => row.type === "consult")
    .map<ConsultMarker>((row) => ({
      id: String(row.id),
      occurred_at: toIso(row.occurred_at, new Date(0).toISOString()),
      provider: toNullableString(row.provider),
      specialty: null,
      purpose: String(row.title ?? "Consult"),
      summary: toNullableString(row.summary),
    }));

  return [...fromAppointments, ...fromEvents].sort((a, b) =>
    a.occurred_at.localeCompare(b.occurred_at),
  );
}

function buildDiagnosticMilestones(rows: Row[]): DiagnosticMilestoneMarker[] {
  // No `diagnosis_status_history` table exists in the schema. We derive a
  // single milestone per diagnosis from the row itself, using
  // `last_reviewed_at` (preferred) or `updated_at` as the timestamp.
  return rows
    .map((row) => {
      const occurredAt =
        toIsoOrNull(row.last_reviewed_at) ??
        toIsoOrNull(row.updated_at) ??
        toIsoOrNull(row.created_at);
      if (!occurredAt) return null;
      return {
        id: String(row.id),
        occurred_at: occurredAt,
        diagnosis_id: String(row.id),
        diagnosis_name: String(row.title ?? "Diagnosis"),
        status_to:
          (row.status as DiagnosticMilestoneMarker["status_to"]) ??
          "unreviewed",
        notes: toNullableString(row.summary),
      } satisfies DiagnosticMilestoneMarker;
    })
    .filter((row): row is DiagnosticMilestoneMarker => row !== null)
    .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
}

function buildDecisionMarkers(rows: Row[]): DecisionMarker[] {
  return rows
    .map<DecisionMarker>((row) => {
      const decidedAt =
        row.status === "decided" || row.status === "rejected"
          ? toIsoOrNull(row.updated_at)
          : null;
      return {
        id: String(row.id),
        title: String(row.title ?? "Decision"),
        target_date:
          typeof row.target_date === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(row.target_date)
            ? row.target_date
            : null,
        decided_at: decidedAt,
        status: (row.status as DecisionMarker["status"]) ?? "open",
      };
    })
    .sort((a, b) => {
      const aKey = a.decided_at ?? a.target_date ?? "";
      const bKey = b.decided_at ?? b.target_date ?? "";
      return aKey.localeCompare(bKey);
    });
}

async function selectDecisionsInRange(
  supabase: SupabaseClient,
  fromIso: string,
  toIso: string,
): Promise<Row[]> {
  // Decisions don't have a single date column — `target_date` is a date,
  // `updated_at`/`created_at` are timestamps. We fetch non-deleted rows and
  // filter in memory using whichever timestamp is most informative.
  const { data, error } = await supabase
    .from("decisions")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: true })
    .limit(TIMELINE_SERIES_SOURCE_ROW_LIMIT);

  if (error) throw error;

  const rows = (data ?? []) as Row[];
  const fromTs = Date.parse(fromIso);
  const toTs = Date.parse(toIso);

  return rows.filter((row) => {
    const targetIso = dateToIsoStartOfDay(row.target_date);
    const updatedIso = toIsoOrNull(row.updated_at);
    const candidates = [targetIso, updatedIso].filter(
      (value): value is string => value !== null,
    );
    if (candidates.length === 0) return true;
    return candidates.some((value) => {
      const ts = Date.parse(value);
      return ts >= fromTs && ts <= toTs;
    });
  });
}

async function selectDiagnosesInRange(
  supabase: SupabaseClient,
  fromIso: string,
  toIso: string,
): Promise<Row[]> {
  const { data, error } = await supabase
    .from("diagnoses")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: true })
    .limit(TIMELINE_SERIES_SOURCE_ROW_LIMIT);

  if (error) throw error;

  const rows = (data ?? []) as Row[];
  const fromTs = Date.parse(fromIso);
  const toTs = Date.parse(toIso);

  return rows.filter((row) => {
    const reviewedIso = toIsoOrNull(row.last_reviewed_at);
    const updatedIso = toIsoOrNull(row.updated_at);
    const candidate = reviewedIso ?? updatedIso;
    if (!candidate) return true;
    const ts = Date.parse(candidate);
    return ts >= fromTs && ts <= toTs;
  });
}

export type TimelineSeriesSourceRows = {
  entries?: Row[];
  events?: Row[];
  medications?: Row[];
  appointments?: Row[];
  diagnoses?: Row[];
  decisions?: Row[];
};

export type BuildTimelineSeriesOptions = {
  rows: TimelineSeriesSourceRows;
  filter: TimelineSeriesFilter;
  injuryAnchorIso: string | null;
  now?: Date;
};

export function buildTimelineSeries({
  rows,
  filter,
  injuryAnchorIso,
  now = new Date(),
}: BuildTimelineSeriesOptions): TimelineSeries {
  const parsed = timelineSeriesFilterSchema.parse(filter);
  const todayIso = now.toISOString();

  const defaultFrom = injuryAnchorIso
    ? injuryAnchorIso
    : new Date(now.getTime() - FIVE_YEARS_MS).toISOString();
  const defaultTo = new Date(now.getTime() + THIRTY_DAYS_MS).toISOString();

  const fromIso = parsed.date_from
    ? new Date(parsed.date_from).toISOString()
    : defaultFrom;
  const toIso = parsed.date_to
    ? new Date(parsed.date_to).toISOString()
    : defaultTo;

  const series: TimelineSeries = {
    range: { from: fromIso, to: toIso },
    anchors: { injury_date: injuryAnchorIso, today: todayIso },
    pain_points: buildPainPoints(rows.entries ?? []),
    flare_sessions: buildFlareSessions(rows.entries ?? []),
    medications: buildMedicationRanges(rows.medications ?? []),
    procedures: buildProcedureMarkers(rows.events ?? []),
    consults: buildConsultMarkers(rows.appointments ?? [], rows.events ?? []),
    diagnostic_milestones: buildDiagnosticMilestones(rows.diagnoses ?? []),
    decisions: buildDecisionMarkers(rows.decisions ?? []),
  };

  return timelineSeriesSchema.parse(series);
}

export async function getTimelineSeries(
  input: TimelineSeriesFilter,
  supabase: SupabaseClient,
): Promise<TimelineSeries> {
  const parsed = timelineSeriesFilterSchema.parse(input);
  await requireCurrentProfile(supabase);

  const now = new Date();
  const injuryAnchorIso = await selectInjuryAnchor(supabase);

  const defaultFrom = injuryAnchorIso
    ? injuryAnchorIso
    : new Date(now.getTime() - FIVE_YEARS_MS).toISOString();
  const defaultTo = new Date(now.getTime() + THIRTY_DAYS_MS).toISOString();
  const fromIso = parsed.date_from
    ? new Date(parsed.date_from).toISOString()
    : defaultFrom;
  const toIso = parsed.date_to
    ? new Date(parsed.date_to).toISOString()
    : defaultTo;

  const [entries, events, medications, appointments, diagnoses, decisions] =
    await Promise.all([
      selectInRange(supabase, "entries", "occurred_at", fromIso, toIso),
      selectInRange(supabase, "events", "occurred_at", fromIso, toIso),
      selectMedicationsOverlappingRange(supabase, fromIso, toIso),
      selectInRange(supabase, "appointments", "date_time", fromIso, toIso),
      selectDiagnosesInRange(supabase, fromIso, toIso),
      selectDecisionsInRange(supabase, fromIso, toIso),
    ]);

  return buildTimelineSeries({
    rows: { entries, events, medications, appointments, diagnoses, decisions },
    filter: { date_from: fromIso, date_to: toIso },
    injuryAnchorIso,
    now,
  });
}
