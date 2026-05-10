import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_PAGE_SIZE,
  createEntryInputSchema,
  entryDTOSchema,
  entryFilterSchema,
  updateEntryInputSchema,
  type CreateEntryInput,
  type EntryDTO,
  type EntryFilter,
  type UpdateEntryInput,
} from "@/server/contracts";
import { recordSoftDeleteReason } from "./audit";
import { assertCanWrite, requireCurrentProfile } from "./auth";

type EntryLinkInput = {
  body_region_ids?: string[];
  symptoms?: { symptom_id: string; severity?: number; notes?: string }[];
  triggers?: { trigger_id: string; notes?: string }[];
};

type PaginatedEntries = {
  items: EntryDTO[];
  next_cursor: string | null;
  page_size: number;
};

type EntryRow = Record<string, unknown>;

function groupIdsByEntry(
  rows: { entry_id: unknown; [key: string]: unknown }[] | null | undefined,
  idColumn: string,
) {
  const grouped = new Map<string, string[]>();
  for (const row of rows ?? []) {
    const entryId = String(row.entry_id);
    const list = grouped.get(entryId) ?? [];
    list.push(String(row[idColumn]));
    grouped.set(entryId, list);
  }
  return grouped;
}

async function hydrateEntries(
  supabase: SupabaseClient,
  rows: EntryRow[],
): Promise<EntryDTO[]> {
  if (rows.length === 0) {
    return [];
  }

  const entryIds = rows.map((row) => String(row.id));
  const [regionsResult, symptomsResult, triggersResult] = await Promise.all([
    supabase
      .from("entry_regions")
      .select("entry_id,body_region_id")
      .in("entry_id", entryIds)
      .is("deleted_at", null),
    supabase
      .from("entry_symptoms")
      .select("entry_id,symptom_id")
      .in("entry_id", entryIds)
      .is("deleted_at", null),
    supabase
      .from("entry_triggers")
      .select("entry_id,trigger_id")
      .in("entry_id", entryIds)
      .is("deleted_at", null),
  ]);

  if (regionsResult.error) throw regionsResult.error;
  if (symptomsResult.error) throw symptomsResult.error;
  if (triggersResult.error) throw triggersResult.error;

  const regionsByEntry = groupIdsByEntry(regionsResult.data, "body_region_id");
  const symptomsByEntry = groupIdsByEntry(symptomsResult.data, "symptom_id");
  const triggersByEntry = groupIdsByEntry(triggersResult.data, "trigger_id");

  return rows.map((row) => {
    const entryId = String(row.id);
    return entryDTOSchema.parse({
      ...row,
      body_region_ids: regionsByEntry.get(entryId) ?? [],
      symptom_ids: symptomsByEntry.get(entryId) ?? [],
      trigger_ids: triggersByEntry.get(entryId) ?? [],
    });
  });
}

async function hydrateEntry(
  supabase: SupabaseClient,
  row: EntryRow,
): Promise<EntryDTO> {
  const [entry] = await hydrateEntries(supabase, [row]);
  return entry;
}

async function replaceEntryLinks(
  supabase: SupabaseClient,
  familyId: string,
  entryId: string,
  links: EntryLinkInput,
) {
  const deletedAt = new Date().toISOString();

  async function replaceLinkSet<T>(
    table: "entry_regions" | "entry_symptoms" | "entry_triggers",
    onConflict: string,
    items: T[] | undefined,
    toRow: (item: T) => Record<string, unknown>,
  ) {
    if (!items) return;

    const { error: clearError } = await supabase
      .from(table)
      .update({ deleted_at: deletedAt })
      .eq("entry_id", entryId);
    if (clearError) throw clearError;

    if (items.length === 0) return;

    const { error } = await supabase
      .from(table)
      .upsert(items.map(toRow), { onConflict });
    if (error) throw error;
  }

  await replaceLinkSet(
    "entry_regions",
    "entry_id,body_region_id",
    links.body_region_ids,
    (bodyRegionId) => ({
      family_id: familyId,
      entry_id: entryId,
      body_region_id: bodyRegionId,
      deleted_at: null,
    }),
  );

  await replaceLinkSet(
    "entry_symptoms",
    "entry_id,symptom_id",
    links.symptoms,
    (symptom) => ({
      family_id: familyId,
      entry_id: entryId,
      symptom_id: symptom.symptom_id,
      severity: symptom.severity,
      notes: symptom.notes,
      deleted_at: null,
    }),
  );

  await replaceLinkSet(
    "entry_triggers",
    "entry_id,trigger_id",
    links.triggers,
    (trigger) => ({
      family_id: familyId,
      entry_id: entryId,
      trigger_id: trigger.trigger_id,
      notes: trigger.notes,
      deleted_at: null,
    }),
  );
}

async function findEntryIdsForFilter(
  supabase: SupabaseClient,
  tableName: "entry_regions" | "entry_symptoms" | "entry_triggers",
  columnName: "body_region_id" | "symptom_id" | "trigger_id",
  value: string,
) {
  const { data, error } = await supabase
    .from(tableName)
    .select("entry_id")
    .eq(columnName, value)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }

  return new Set(data?.map((row) => String(row.entry_id)) ?? []);
}

function intersectEntryIdSets(sets: Set<string>[]) {
  if (sets.length === 0) {
    return undefined;
  }

  const [firstSet, ...restSets] = sets;
  return [...firstSet].filter((id) => restSets.every((set) => set.has(id)));
}

export async function createEntry(
  input: CreateEntryInput,
  supabase: SupabaseClient,
): Promise<EntryDTO> {
  const parsed = createEntryInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { body_region_ids, symptoms, triggers, ...entryInput } = parsed;
  const { data, error } = await supabase
    .from("entries")
    .insert({
      ...entryInput,
      family_id: profile.family_id,
      user_id: profile.id,
      created_by: profile.id,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const row = data as EntryRow;
  await replaceEntryLinks(supabase, profile.family_id, String(row.id), {
    body_region_ids,
    symptoms,
    triggers,
  });

  return hydrateEntry(supabase, row);
}

export async function updateEntry(
  input: UpdateEntryInput,
  supabase: SupabaseClient,
): Promise<EntryDTO> {
  const parsed = updateEntryInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { id, body_region_ids, symptoms, triggers, ...entryInput } = parsed;
  const { data, error } = await supabase
    .from("entries")
    .update(entryInput)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await replaceEntryLinks(supabase, profile.family_id, id, {
    body_region_ids,
    symptoms,
    triggers,
  });

  return hydrateEntry(supabase, data as EntryRow);
}

export async function softDeleteEntry(
  id: string,
  reason: string,
  supabase: SupabaseClient,
): Promise<EntryDTO> {
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("entries")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await recordSoftDeleteReason("entries", id, reason, supabase);

  return hydrateEntry(supabase, data as EntryRow);
}

export async function getEntry(
  id: string,
  supabase: SupabaseClient,
): Promise<EntryDTO> {
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Entry not found");
  }

  return hydrateEntry(supabase, data as EntryRow);
}

export async function listEntries(
  input: EntryFilter,
  supabase: SupabaseClient,
): Promise<PaginatedEntries> {
  const parsed = entryFilterSchema.parse(input);
  const filterLookups: Promise<Set<string>>[] = [];

  if (parsed.body_region_id) {
    filterLookups.push(
      findEntryIdsForFilter(
        supabase,
        "entry_regions",
        "body_region_id",
        parsed.body_region_id,
      ),
    );
  }

  if (parsed.symptom_id) {
    filterLookups.push(
      findEntryIdsForFilter(
        supabase,
        "entry_symptoms",
        "symptom_id",
        parsed.symptom_id,
      ),
    );
  }

  if (parsed.trigger_id) {
    filterLookups.push(
      findEntryIdsForFilter(
        supabase,
        "entry_triggers",
        "trigger_id",
        parsed.trigger_id,
      ),
    );
  }

  const filteredIds = intersectEntryIdSets(await Promise.all(filterLookups));

  if (filteredIds && filteredIds.length === 0) {
    return {
      items: [],
      next_cursor: null,
      page_size: parsed.page_size ?? DEFAULT_PAGE_SIZE,
    };
  }

  let query = supabase
    .from("entries")
    .select("*")
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit((parsed.page_size ?? DEFAULT_PAGE_SIZE) + 1);

  if (parsed.cursor) {
    query = query.lt("occurred_at", parsed.cursor);
  }

  if (parsed.date_from) {
    query = query.gte("occurred_at", parsed.date_from);
  }

  if (parsed.date_to) {
    query = query.lte("occurred_at", parsed.date_to);
  }

  if (parsed.type) {
    query = query.eq("type", parsed.type);
  }

  if (parsed.flare_only) {
    query = query.eq("is_flare", true);
  }

  if (filteredIds) {
    query = query.in("id", filteredIds);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const pageSize = parsed.page_size ?? DEFAULT_PAGE_SIZE;
  const rows = (data ?? []) as EntryRow[];
  const pageRows = rows.slice(0, pageSize);
  const items = await hydrateEntries(supabase, pageRows);
  const overflow = rows[pageSize] as EntryRow | undefined;

  return {
    items,
    next_cursor: overflow ? String(overflow.occurred_at) : null,
    page_size: pageSize,
  };
}
