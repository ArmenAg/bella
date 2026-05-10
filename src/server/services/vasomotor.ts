import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_PAGE_SIZE,
  createVasomotorMeasurementInputSchema,
  updateVasomotorMeasurementInputSchema,
  vasomotorFilterSchema,
  vasomotorMeasurementDTOSchema,
  type CreateVasomotorMeasurementInput,
  type UpdateVasomotorMeasurementInput,
  type VasomotorFilter,
  type VasomotorMeasurementDTO,
} from "@/server/contracts";
import { recordSoftDeleteReason } from "./audit";
import { assertCanWrite, requireCurrentProfile } from "./auth";

type VasomotorRow = Record<string, unknown>;

type PaginatedVasomotorMeasurements = {
  items: VasomotorMeasurementDTO[];
  next_cursor: string | null;
  page_size: number;
};

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    return Number(value);
  }
  return null;
}

export function computeDeltaC(
  leftTempC: number | null | undefined,
  rightTempC: number | null | undefined,
): number | null {
  if (leftTempC === null || leftTempC === undefined) return null;
  if (rightTempC === null || rightTempC === undefined) return null;

  return Math.round((rightTempC - leftTempC) * 100) / 100;
}

export function normalizeVasomotorRow(
  row: VasomotorRow,
): VasomotorMeasurementDTO {
  const leftTempC = toNullableNumber(row.left_temp_c);
  const rightTempC = toNullableNumber(row.right_temp_c);
  const deltaC =
    toNullableNumber(row.delta_c) ?? computeDeltaC(leftTempC, rightTempC);

  return vasomotorMeasurementDTOSchema.parse({
    ...row,
    entry_id: row.entry_id ?? null,
    left_temp_c: leftTempC,
    right_temp_c: rightTempC,
    delta_c: deltaC,
    left_color: row.left_color ?? null,
    right_color: row.right_color ?? null,
    lighting_notes: row.lighting_notes ?? null,
    notes: row.notes ?? null,
    left_attachment_id: row.left_attachment_id ?? null,
    right_attachment_id: row.right_attachment_id ?? null,
    deleted_at: row.deleted_at ?? null,
  });
}

async function replaceVasomotorAttachmentLinks(
  measurement: VasomotorMeasurementDTO,
  supabase: SupabaseClient,
) {
  const deletedAt = new Date().toISOString();
  const { error: clearError } = await supabase
    .from("attachment_links")
    .update({ deleted_at: deletedAt })
    .eq("linked_type", "vasomotor_measurement")
    .eq("linked_id", measurement.id);

  if (clearError) {
    throw clearError;
  }

  const links = [
    measurement.left_attachment_id
      ? {
          family_id: measurement.family_id,
          attachment_id: measurement.left_attachment_id,
          linked_type: "vasomotor_measurement",
          linked_id: measurement.id,
          label: "left comparison",
          deleted_at: null,
        }
      : null,
    measurement.right_attachment_id
      ? {
          family_id: measurement.family_id,
          attachment_id: measurement.right_attachment_id,
          linked_type: "vasomotor_measurement",
          linked_id: measurement.id,
          label: "right comparison",
          deleted_at: null,
        }
      : null,
  ].filter((link): link is NonNullable<typeof link> => link !== null);

  if (links.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("attachment_links")
    .upsert(links, { onConflict: "attachment_id,linked_type,linked_id" });

  if (error) {
    throw error;
  }
}

export async function createVasomotorMeasurement(
  input: CreateVasomotorMeasurementInput,
  supabase: SupabaseClient,
): Promise<VasomotorMeasurementDTO> {
  const parsed = createVasomotorMeasurementInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("vasomotor_measurements")
    .insert({
      ...parsed,
      family_id: profile.family_id,
      user_id: profile.id,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const measurement = normalizeVasomotorRow(data as VasomotorRow);
  await replaceVasomotorAttachmentLinks(measurement, supabase);
  return measurement;
}

export async function updateVasomotorMeasurement(
  input: UpdateVasomotorMeasurementInput,
  supabase: SupabaseClient,
): Promise<VasomotorMeasurementDTO> {
  const parsed = updateVasomotorMeasurementInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);
  const { id, ...patch } = parsed;

  const { data, error } = await supabase
    .from("vasomotor_measurements")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const measurement = normalizeVasomotorRow(data as VasomotorRow);
  await replaceVasomotorAttachmentLinks(measurement, supabase);
  return measurement;
}

export async function softDeleteVasomotorMeasurement(
  id: string,
  reason: string,
  supabase: SupabaseClient,
): Promise<VasomotorMeasurementDTO> {
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("vasomotor_measurements")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await recordSoftDeleteReason("vasomotor_measurements", id, reason, supabase);

  return normalizeVasomotorRow(data as VasomotorRow);
}

export async function getVasomotorMeasurement(
  id: string,
  supabase: SupabaseClient,
): Promise<VasomotorMeasurementDTO> {
  await requireCurrentProfile(supabase);

  const { data, error } = await supabase
    .from("vasomotor_measurements")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) throw error;
  if (!data) throw new Error("Vasomotor measurement not found");
  return normalizeVasomotorRow(data as VasomotorRow);
}

export async function listVasomotorMeasurements(
  input: VasomotorFilter,
  supabase: SupabaseClient,
): Promise<PaginatedVasomotorMeasurements> {
  const parsed = vasomotorFilterSchema.parse(input);
  const pageSize = parsed.page_size ?? DEFAULT_PAGE_SIZE;

  let query = supabase
    .from("vasomotor_measurements")
    .select("*")
    .is("deleted_at", null)
    .order("measured_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);

  if (parsed.cursor) {
    query = query.lt("measured_at", parsed.cursor);
  }

  if (parsed.entry_id) {
    query = query.eq("entry_id", parsed.entry_id);
  }

  if (parsed.date_from) {
    query = query.gte("measured_at", parsed.date_from);
  }

  if (parsed.date_to) {
    query = query.lte("measured_at", parsed.date_to);
  }

  if (parsed.site) {
    query = query.eq("site", parsed.site);
  }

  if (parsed.context) {
    query = query.eq("context", parsed.context);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = ((data ?? []) as VasomotorRow[]).map(normalizeVasomotorRow);
  const items = rows.slice(0, pageSize);
  const overflow = rows[pageSize];

  return {
    items,
    next_cursor: overflow ? overflow.measured_at : null,
    page_size: pageSize,
  };
}
