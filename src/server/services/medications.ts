import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_PAGE_SIZE,
  createMedicationInputSchema,
  createMedicationResponseInputSchema,
  medicationFilterSchema,
  medicationResponseFilterSchema,
  medicationResponseSchema,
  medicationSchema,
  updateMedicationInputSchema,
  updateMedicationResponseInputSchema,
  type CreateMedicationInput,
  type CreateMedicationResponseInput,
  type Medication,
  type MedicationFilter,
  type MedicationResponse,
  type MedicationResponseFilter,
  type UpdateMedicationInput,
  type UpdateMedicationResponseInput,
} from "@/server/contracts";
import { recordSoftDeleteReason } from "./audit";
import { assertCanWrite, requireCurrentProfile } from "./auth";
import { NotFoundError } from "./errors";

type Row = Record<string, unknown>;

type PaginatedMedications = {
  items: Medication[];
  next_cursor: string | null;
  page_size: number;
};

type PaginatedMedicationResponses = {
  items: MedicationResponse[];
  next_cursor: string | null;
  page_size: number;
};

export function normalizeMedicationRow(row: Row): Medication {
  return medicationSchema.parse({
    ...row,
    dose: row.dose ?? null,
    route: row.route ?? null,
    frequency: row.frequency ?? null,
    start_date: row.start_date ?? null,
    stop_date: row.stop_date ?? null,
    prescriber: row.prescriber ?? null,
    reason: row.reason ?? null,
    helped_pain: row.helped_pain ?? null,
    helped_sleep: row.helped_sleep ?? null,
    helped_anxiety: row.helped_anxiety ?? null,
    helped_function: row.helped_function ?? null,
    side_effects: row.side_effects ?? null,
    notes: row.notes ?? null,
    deleted_at: row.deleted_at ?? null,
  });
}

export function normalizeMedicationResponseRow(row: Row): MedicationResponse {
  return medicationResponseSchema.parse({
    ...row,
    medication_id: row.medication_id ?? null,
    entry_id: row.entry_id ?? null,
    reason: row.reason ?? null,
    pain_before: row.pain_before ?? null,
    pain_after_30m: row.pain_after_30m ?? null,
    pain_after_60m: row.pain_after_60m ?? null,
    pain_after_120m: row.pain_after_120m ?? null,
    sedation_effect: row.sedation_effect ?? null,
    cognition_effect: row.cognition_effect ?? null,
    gait_effect: row.gait_effect ?? null,
    side_effects: row.side_effects ?? null,
    helped: row.helped ?? null,
    notes: row.notes ?? null,
    deleted_at: row.deleted_at ?? null,
  });
}

export async function createMedication(
  input: CreateMedicationInput,
  supabase: SupabaseClient,
): Promise<Medication> {
  const parsed = createMedicationInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("medications")
    .insert({ ...parsed, family_id: profile.family_id, user_id: profile.id })
    .select("*")
    .single();

  if (error) throw error;
  return normalizeMedicationRow(data as Row);
}

export async function updateMedication(
  input: UpdateMedicationInput,
  supabase: SupabaseClient,
): Promise<Medication> {
  const parsed = updateMedicationInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);
  const { id, ...patch } = parsed;

  const { data, error } = await supabase
    .from("medications")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeMedicationRow(data as Row);
}

export async function softDeleteMedication(
  id: string,
  reason: string,
  supabase: SupabaseClient,
): Promise<Medication> {
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("medications")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  await recordSoftDeleteReason("medications", id, reason, supabase);
  return normalizeMedicationRow(data as Row);
}

export async function getMedication(
  id: string,
  supabase: SupabaseClient,
): Promise<Medication> {
  await requireCurrentProfile(supabase);

  const { data, error } = await supabase
    .from("medications")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) throw error;
  if (!data) throw new NotFoundError("Medication not found");
  return normalizeMedicationRow(data as Row);
}

export async function listMedications(
  input: MedicationFilter,
  supabase: SupabaseClient,
): Promise<PaginatedMedications> {
  const parsed = medicationFilterSchema.parse(input);
  const pageSize = parsed.page_size ?? DEFAULT_PAGE_SIZE;

  let query = supabase
    .from("medications")
    .select("*")
    .is("deleted_at", null)
    .order("status", { ascending: true })
    .order("name", { ascending: true })
    .limit(pageSize + 1);

  if (parsed.cursor) query = query.gt("name", parsed.cursor);
  if (parsed.status) query = query.eq("status", parsed.status);

  const { data, error } = await query;
  if (error) throw error;

  const rows = ((data ?? []) as Row[]).map(normalizeMedicationRow);
  const items = rows.slice(0, pageSize);
  const overflow = rows[pageSize];

  return {
    items,
    next_cursor: overflow ? overflow.name : null,
    page_size: pageSize,
  };
}

export async function createMedicationResponse(
  input: CreateMedicationResponseInput,
  supabase: SupabaseClient,
): Promise<MedicationResponse> {
  const parsed = createMedicationResponseInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("medication_responses")
    .insert({ ...parsed, family_id: profile.family_id, user_id: profile.id })
    .select("*")
    .single();

  if (error) throw error;
  return normalizeMedicationResponseRow(data as Row);
}

export async function updateMedicationResponse(
  input: UpdateMedicationResponseInput,
  supabase: SupabaseClient,
): Promise<MedicationResponse> {
  const parsed = updateMedicationResponseInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);
  const { id, ...patch } = parsed;

  const { data, error } = await supabase
    .from("medication_responses")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeMedicationResponseRow(data as Row);
}

export async function softDeleteMedicationResponse(
  id: string,
  reason: string,
  supabase: SupabaseClient,
): Promise<MedicationResponse> {
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("medication_responses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  await recordSoftDeleteReason("medication_responses", id, reason, supabase);
  return normalizeMedicationResponseRow(data as Row);
}

export async function getMedicationResponse(
  id: string,
  supabase: SupabaseClient,
): Promise<MedicationResponse> {
  await requireCurrentProfile(supabase);

  const { data, error } = await supabase
    .from("medication_responses")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) throw error;
  if (!data) throw new NotFoundError("Medication response not found");
  return normalizeMedicationResponseRow(data as Row);
}

export async function listMedicationResponses(
  input: MedicationResponseFilter,
  supabase: SupabaseClient,
): Promise<PaginatedMedicationResponses> {
  const parsed = medicationResponseFilterSchema.parse(input);
  const pageSize = parsed.page_size ?? DEFAULT_PAGE_SIZE;

  let query = supabase
    .from("medication_responses")
    .select("*")
    .is("deleted_at", null)
    .order("taken_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);

  if (parsed.cursor) query = query.lt("taken_at", parsed.cursor);
  if (parsed.medication_id)
    query = query.eq("medication_id", parsed.medication_id);
  if (parsed.entry_id) query = query.eq("entry_id", parsed.entry_id);
  if (parsed.date_from) query = query.gte("taken_at", parsed.date_from);
  if (parsed.date_to) query = query.lte("taken_at", parsed.date_to);

  const { data, error } = await query;
  if (error) throw error;

  const rows = ((data ?? []) as Row[]).map(normalizeMedicationResponseRow);
  const items = rows.slice(0, pageSize);
  const overflow = rows[pageSize];

  return {
    items,
    next_cursor: overflow ? overflow.taken_at : null,
    page_size: pageSize,
  };
}
