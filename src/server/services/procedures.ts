import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_PAGE_SIZE,
  createProcedureEventInputSchema,
  procedureEventFilterSchema,
  procedureEventSchema,
  updateProcedureEventInputSchema,
  type CreateProcedureEventInput,
  type ProcedureEvent,
  type ProcedureEventFilter,
  type UpdateProcedureEventInput,
} from "@/server/contracts";
import { recordSoftDeleteReason } from "./audit";
import { assertCanWrite, requireCurrentProfile } from "./auth";
import { NotFoundError } from "./errors";

type Row = Record<string, unknown>;

type PaginatedProcedureEvents = {
  items: ProcedureEvent[];
  next_cursor: string | null;
  page_size: number;
};

export function normalizeProcedureEventRow(row: Row): ProcedureEvent {
  return procedureEventSchema.parse({
    ...row,
    ended_at: row.ended_at ?? null,
    summary: row.summary ?? null,
    provider: row.provider ?? null,
    location: row.location ?? null,
    source_id: row.source_id ?? null,
    diagnostic_question: row.diagnostic_question ?? null,
    baseline_before: row.baseline_before ?? null,
    immediate_effect: row.immediate_effect ?? null,
    effect_24h: row.effect_24h ?? null,
    effect_72h: row.effect_72h ?? null,
    effect_1w: row.effect_1w ?? null,
    effect_1m: row.effect_1m ?? null,
    new_symptoms: row.new_symptoms ?? null,
    answered_question: row.answered_question ?? null,
    repeat_recommendation: row.repeat_recommendation ?? null,
    deleted_at: row.deleted_at ?? null,
  });
}

export async function createProcedureEvent(
  input: CreateProcedureEventInput,
  supabase: SupabaseClient,
): Promise<ProcedureEvent> {
  const parsed = createProcedureEventInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("events")
    .insert({ ...parsed, family_id: profile.family_id, user_id: profile.id })
    .select("*")
    .single();

  if (error) throw error;
  return normalizeProcedureEventRow(data as Row);
}

export async function updateProcedureEvent(
  input: UpdateProcedureEventInput,
  supabase: SupabaseClient,
): Promise<ProcedureEvent> {
  const parsed = updateProcedureEventInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);
  const { id, ...patch } = parsed;

  const { data, error } = await supabase
    .from("events")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeProcedureEventRow(data as Row);
}

export async function softDeleteProcedureEvent(
  id: string,
  reason: string,
  supabase: SupabaseClient,
): Promise<ProcedureEvent> {
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  await recordSoftDeleteReason("events", id, reason, supabase);
  return normalizeProcedureEventRow(data as Row);
}

export async function getProcedureEvent(
  id: string,
  supabase: SupabaseClient,
): Promise<ProcedureEvent> {
  await requireCurrentProfile(supabase);

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) throw error;
  if (!data) throw new NotFoundError("Procedure event not found");
  return normalizeProcedureEventRow(data as Row);
}

export async function listProcedureEvents(
  input: ProcedureEventFilter,
  supabase: SupabaseClient,
): Promise<PaginatedProcedureEvents> {
  const parsed = procedureEventFilterSchema.parse(input);
  const pageSize = parsed.page_size ?? DEFAULT_PAGE_SIZE;
  const procedureTypes = [
    "procedure",
    "imaging",
    "test_lab",
    "consult",
    "procedure_test",
  ];

  let query = supabase
    .from("events")
    .select("*")
    .is("deleted_at", null)
    .in("type", parsed.type ? [parsed.type] : procedureTypes)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);

  if (parsed.cursor) query = query.lt("occurred_at", parsed.cursor);
  if (parsed.date_from) query = query.gte("occurred_at", parsed.date_from);
  if (parsed.date_to) query = query.lte("occurred_at", parsed.date_to);
  if (parsed.source_id) query = query.eq("source_id", parsed.source_id);

  const { data, error } = await query;
  if (error) throw error;

  const rows = ((data ?? []) as Row[]).map(normalizeProcedureEventRow);
  const items = rows.slice(0, pageSize);
  const overflow = rows[pageSize];

  return {
    items,
    next_cursor: overflow ? overflow.occurred_at : null,
    page_size: pageSize,
  };
}
