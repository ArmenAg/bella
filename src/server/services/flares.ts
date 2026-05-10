import type { SupabaseClient } from "@supabase/supabase-js";
import {
  endFlareInputSchema,
  flareCheckpointDTOSchema,
  flareCheckpointInputSchema,
  flareSessionDTOSchema,
  recentFlareSummaryFilterSchema,
  recentFlareSummarySchema,
  startFlareInputSchema,
  updateFlareInputSchema,
  type ActiveFlareResult,
  type EndFlareInput,
  type FlareCheckpointDTO,
  type FlareCheckpointInput,
  type FlareSessionDTO,
  type RecentFlareSummary,
  type RecentFlareSummaryFilter,
  type StartFlareInput,
  type UpdateFlareInput,
} from "@/server/contracts";
import { createEntry, getEntry, updateEntry } from "./entries";
import { assertCanWrite, requireCurrentProfile } from "./auth";

type FlareCheckpointRow = Record<string, unknown>;
type FlareEntryRow = Record<string, unknown>;

type PaginatedRecentFlareSummaries = {
  items: RecentFlareSummary[];
  next_cursor: string | null;
  page_size: number;
};

function normalizeCheckpointRow(row: FlareCheckpointRow): FlareCheckpointDTO {
  return flareCheckpointDTOSchema.parse({
    ...row,
    pain_score: row.pain_score ?? null,
    symptoms: Array.isArray(row.symptoms) ? row.symptoms : [],
    notes: row.notes ?? null,
    deleted_at: row.deleted_at ?? null,
  });
}

function compactNotes(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return null;
  return compact.length > 240 ? `${compact.slice(0, 237)}...` : compact;
}

function groupIdsByEntry(
  rows: { entry_id: unknown; [key: string]: unknown }[] | null | undefined,
  idColumn: string,
) {
  const grouped = new Map<string, string[]>();
  for (const row of rows ?? []) {
    const entryId = String(row.entry_id);
    const ids = grouped.get(entryId) ?? [];
    ids.push(String(row[idColumn]));
    grouped.set(entryId, ids);
  }
  return grouped;
}

export function computeRecoveryMinutes(
  occurredAt: string,
  endedAt: string,
): number {
  const durationMs = Date.parse(endedAt) - Date.parse(occurredAt);

  if (!Number.isFinite(durationMs) || durationMs < 0) {
    throw new Error("ended_at must be after occurred_at");
  }

  return Math.floor(durationMs / 60000);
}

async function listFlareCheckpoints(
  entryId: string,
  supabase: SupabaseClient,
): Promise<FlareCheckpointDTO[]> {
  const { data, error } = await supabase
    .from("flare_checkpoints")
    .select("*")
    .eq("entry_id", entryId)
    .is("deleted_at", null)
    .order("checkpoint_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as FlareCheckpointRow[]).map(normalizeCheckpointRow);
}

async function getFlareSession(
  entryId: string,
  supabase: SupabaseClient,
): Promise<FlareSessionDTO> {
  const [entry, checkpoints] = await Promise.all([
    getEntry(entryId, supabase),
    listFlareCheckpoints(entryId, supabase),
  ]);

  return flareSessionDTOSchema.parse({ entry, checkpoints });
}

async function assertNoActiveFlareForCurrentUser(
  familyId: string,
  userId: string,
  supabase: SupabaseClient,
) {
  const { data, error } = await supabase
    .from("entries")
    .select("id")
    .eq("family_id", familyId)
    .eq("user_id", userId)
    .eq("is_flare", true)
    .eq("flare_status", "active")
    .is("deleted_at", null)
    .limit(1);

  if (error) {
    throw error;
  }

  if ((data ?? []).length > 0) {
    throw new Error("Active flare already exists for this user");
  }
}

async function insertCheckpoint(
  input: FlareCheckpointInput,
  supabase: SupabaseClient,
): Promise<FlareCheckpointDTO> {
  const parsed = flareCheckpointInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("flare_checkpoints")
    .insert({
      ...parsed,
      family_id: profile.family_id,
      user_id: profile.id,
      symptoms: parsed.symptoms,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeCheckpointRow(data as FlareCheckpointRow);
}

export async function startFlare(
  input: StartFlareInput,
  supabase: SupabaseClient,
): Promise<FlareSessionDTO> {
  const parsed = startFlareInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);
  await assertNoActiveFlareForCurrentUser(
    profile.family_id,
    profile.id,
    supabase,
  );

  const entry = await createEntry(
    {
      type: "flare",
      occurred_at: parsed.occurred_at,
      title: parsed.title,
      pain_current: parsed.pain_current,
      pain_peak: parsed.pain_peak,
      primary_trigger_id: parsed.primary_trigger_id,
      notes: parsed.notes,
      is_flare: true,
      flare_status: "active",
      client_recorded_at: parsed.client_recorded_at,
      body_region_ids: parsed.body_region_ids,
      symptoms: parsed.symptoms,
      triggers: parsed.triggers,
    },
    supabase,
  );

  await insertCheckpoint(
    {
      entry_id: entry.id,
      checkpoint_type: "start",
      checkpoint_at: parsed.occurred_at,
      pain_score: parsed.pain_current ?? parsed.pain_peak,
      symptoms: parsed.symptoms,
      notes: parsed.notes,
    },
    supabase,
  );

  return getFlareSession(entry.id, supabase);
}

export async function addFlareCheckpoint(
  input: FlareCheckpointInput,
  supabase: SupabaseClient,
): Promise<FlareSessionDTO> {
  const checkpoint = await insertCheckpoint(input, supabase);
  return getFlareSession(checkpoint.entry_id, supabase);
}

export async function updateFlare(
  input: UpdateFlareInput,
  supabase: SupabaseClient,
): Promise<FlareSessionDTO> {
  const parsed = updateFlareInputSchema.parse(input);
  const { entry_id: entryId, ...entryPatch } = parsed;

  await updateEntry(
    {
      id: entryId,
      ...entryPatch,
    },
    supabase,
  );

  return getFlareSession(entryId, supabase);
}

export async function endFlare(
  input: EndFlareInput,
  supabase: SupabaseClient,
): Promise<FlareSessionDTO> {
  const parsed = endFlareInputSchema.parse(input);
  const entry = await getEntry(parsed.entry_id, supabase);
  const recoveryMinutes =
    parsed.recovery_minutes ??
    computeRecoveryMinutes(entry.occurred_at, parsed.ended_at);

  await updateEntry(
    {
      id: parsed.entry_id,
      ended_at: parsed.ended_at,
      pain_current: parsed.pain_current,
      response: parsed.response,
      notes: parsed.notes,
      flare_status: "ended",
      recovery_minutes: recoveryMinutes,
    },
    supabase,
  );

  return getFlareSession(parsed.entry_id, supabase);
}

export async function getActiveFlare(
  supabase: SupabaseClient,
): Promise<ActiveFlareResult> {
  const profile = await requireCurrentProfile(supabase);

  const { data, error } = await supabase
    .from("entries")
    .select("id")
    .eq("family_id", profile.family_id)
    .eq("user_id", profile.id)
    .eq("is_flare", true)
    .eq("flare_status", "active")
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  const [row] = (data ?? []) as { id: string }[];

  if (!row) {
    return null;
  }

  return getFlareSession(row.id, supabase);
}

export async function listRecentFlareSummaries(
  input: RecentFlareSummaryFilter,
  supabase: SupabaseClient,
): Promise<PaginatedRecentFlareSummaries> {
  const parsed = recentFlareSummaryFilterSchema.parse(input);
  const pageSize = parsed.page_size;
  await requireCurrentProfile(supabase);

  let query = supabase
    .from("entries")
    .select("*")
    .eq("is_flare", true)
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);

  if (!parsed.include_active) {
    query = query.eq("flare_status", "ended");
  }

  if (parsed.cursor) {
    query = query.lt("occurred_at", parsed.cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as FlareEntryRow[];
  const pageRows = rows.slice(0, pageSize);
  const overflow = rows[pageSize];
  const entryIds = pageRows.map((row) => String(row.id));

  if (entryIds.length === 0) {
    return { items: [], next_cursor: null, page_size: pageSize };
  }

  const [regionsResult, triggersResult, checkpointsResult] = await Promise.all([
    supabase
      .from("entry_regions")
      .select("entry_id,body_region_id")
      .in("entry_id", entryIds)
      .is("deleted_at", null),
    supabase
      .from("entry_triggers")
      .select("entry_id,trigger_id")
      .in("entry_id", entryIds)
      .is("deleted_at", null),
    supabase
      .from("flare_checkpoints")
      .select("entry_id,pain_score")
      .in("entry_id", entryIds)
      .is("deleted_at", null),
  ]);

  if (regionsResult.error) throw regionsResult.error;
  if (triggersResult.error) throw triggersResult.error;
  if (checkpointsResult.error) throw checkpointsResult.error;

  const regionsByEntry = groupIdsByEntry(regionsResult.data, "body_region_id");
  const triggersByEntry = groupIdsByEntry(triggersResult.data, "trigger_id");
  const checkpointStats = new Map<
    string,
    { count: number; peakPain: number | null }
  >();

  for (const checkpoint of checkpointsResult.data ?? []) {
    const entryId = String(checkpoint.entry_id);
    const existing = checkpointStats.get(entryId) ?? {
      count: 0,
      peakPain: null,
    };
    const painScore =
      typeof checkpoint.pain_score === "number" ? checkpoint.pain_score : null;
    checkpointStats.set(entryId, {
      count: existing.count + 1,
      peakPain:
        painScore === null
          ? existing.peakPain
          : Math.max(existing.peakPain ?? painScore, painScore),
    });
  }

  const items = pageRows.map((row) => {
    const entryId = String(row.id);
    const endedAt = typeof row.ended_at === "string" ? row.ended_at : null;
    const startedAt = String(row.occurred_at);
    const durationMinutes = endedAt
      ? Math.max(
          0,
          Math.floor((Date.parse(endedAt) - Date.parse(startedAt)) / 60000),
        )
      : null;
    const stats = checkpointStats.get(entryId) ?? {
      count: 0,
      peakPain: null,
    };
    const entryPeak =
      typeof row.pain_peak === "number"
        ? row.pain_peak
        : typeof row.pain_current === "number"
          ? row.pain_current
          : null;
    const peakPain =
      entryPeak === null
        ? stats.peakPain
        : Math.max(entryPeak, stats.peakPain ?? entryPeak);

    return recentFlareSummarySchema.parse({
      entry_id: entryId,
      title: String(row.title ?? "Flare"),
      started_at: startedAt,
      ended_at: endedAt,
      duration_minutes: durationMinutes,
      recovery_minutes:
        typeof row.recovery_minutes === "number" ? row.recovery_minutes : null,
      peak_pain: peakPain,
      checkpoints_count: stats.count,
      trigger_ids: triggersByEntry.get(entryId) ?? [],
      body_region_ids: regionsByEntry.get(entryId) ?? [],
      notes_summary: compactNotes(row.notes),
    });
  });

  return {
    items,
    next_cursor: overflow ? String(overflow.occurred_at) : null,
    page_size: pageSize,
  };
}
