import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_PAGE_SIZE,
  createDiagnosisInputSchema,
  createEvidenceLinkInputSchema,
  diagnosisFilterSchema,
  diagnosisMergeResultSchema,
  diagnosisNodeSchema,
  diagnosisSplitResultSchema,
  evidenceLinkSchema,
  evidenceLinkFilterSchema,
  mergeDiagnosisNodesInputSchema,
  splitDiagnosisNodeInputSchema,
  updateDiagnosisInputSchema,
  updateEvidenceLinkInputSchema,
  type CreateDiagnosisInput,
  type CreateEvidenceLinkInput,
  type DiagnosisFilter,
  type DiagnosisMergeResult,
  type DiagnosisNode,
  type DiagnosisSplitResult,
  type EvidenceLink,
  type EvidenceLinkFilter,
  type MergeDiagnosisNodesInput,
  type SplitDiagnosisNodeInput,
  type UpdateDiagnosisInput,
  type UpdateEvidenceLinkInput,
} from "@/server/contracts";
import { recordSoftDeleteReason } from "./audit";
import { assertCanWrite, requireCurrentProfile } from "./auth";
import { NotFoundError } from "./errors";

type DiagnosisRow = Record<string, unknown>;
type EvidenceLinkRow = Record<string, unknown>;

type PaginatedDiagnoses = {
  items: DiagnosisNode[];
  next_cursor: string | null;
  page_size: number;
};

function normalizeDiagnosisRow(row: DiagnosisRow): DiagnosisNode {
  return diagnosisNodeSchema.parse({
    ...row,
    parent_diagnosis_id: row.parent_diagnosis_id ?? null,
    summary: row.summary ?? null,
    why_considered: row.why_considered ?? null,
    evidence_for: row.evidence_for ?? null,
    evidence_against: row.evidence_against ?? null,
    tests_needed: row.tests_needed ?? null,
    treatment_implications: row.treatment_implications ?? null,
    open_questions: Array.isArray(row.open_questions) ? row.open_questions : [],
    last_reviewed_at: row.last_reviewed_at ?? null,
    deleted_at: row.deleted_at ?? null,
  });
}

export function normalizeEvidenceLinkRow(row: EvidenceLinkRow): EvidenceLink {
  return evidenceLinkSchema.parse({
    ...row,
    note: row.note ?? null,
    deleted_at: row.deleted_at ?? null,
  });
}

export async function getDiagnosis(
  id: string,
  supabase: SupabaseClient,
): Promise<DiagnosisNode> {
  await requireCurrentProfile(supabase);

  const { data, error } = await supabase
    .from("diagnoses")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new NotFoundError("Diagnosis not found");
  }

  return normalizeDiagnosisRow(data as DiagnosisRow);
}

async function recordDiagnosticAudit(
  action: "merge" | "split",
  entityId: string,
  before: unknown,
  after: unknown,
  supabase: SupabaseClient,
) {
  const { error } = await supabase.rpc("record_diagnostic_action", {
    action_name: action,
    target_entity_type: "diagnoses",
    target_entity_id: entityId,
    before_state: before,
    after_state: after,
  });

  if (error) {
    throw error;
  }
}

export async function createDiagnosis(
  input: CreateDiagnosisInput,
  supabase: SupabaseClient,
): Promise<DiagnosisNode> {
  const parsed = createDiagnosisInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("diagnoses")
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

  return normalizeDiagnosisRow(data as DiagnosisRow);
}

export async function updateDiagnosis(
  input: UpdateDiagnosisInput,
  supabase: SupabaseClient,
): Promise<DiagnosisNode> {
  const parsed = updateDiagnosisInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);
  const { id, ...patch } = parsed;

  const { data, error } = await supabase
    .from("diagnoses")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeDiagnosisRow(data as DiagnosisRow);
}

export async function softDeleteDiagnosis(
  id: string,
  reason: string,
  supabase: SupabaseClient,
): Promise<DiagnosisNode> {
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("diagnoses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await recordSoftDeleteReason("diagnoses", id, reason, supabase);

  return normalizeDiagnosisRow(data as DiagnosisRow);
}

export async function listDiagnoses(
  input: DiagnosisFilter,
  supabase: SupabaseClient,
): Promise<PaginatedDiagnoses> {
  const parsed = diagnosisFilterSchema.parse(input);
  const pageSize = parsed.page_size ?? DEFAULT_PAGE_SIZE;

  let query = supabase
    .from("diagnoses")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);

  if (parsed.cursor) {
    query = query.lt("updated_at", parsed.cursor);
  }

  if (parsed.status) {
    query = query.eq("status", parsed.status);
  }

  if (parsed.confidence) {
    query = query.eq("confidence", parsed.confidence);
  }

  if (parsed.parent_diagnosis_id) {
    query = query.eq("parent_diagnosis_id", parsed.parent_diagnosis_id);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = ((data ?? []) as DiagnosisRow[]).map(normalizeDiagnosisRow);
  const items = rows.slice(0, pageSize);
  const overflow = rows[pageSize];

  return {
    items,
    next_cursor: overflow ? overflow.updated_at : null,
    page_size: pageSize,
  };
}

export async function createEvidenceLink(
  input: CreateEvidenceLinkInput,
  supabase: SupabaseClient,
): Promise<EvidenceLink> {
  const parsed = createEvidenceLinkInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("evidence_links")
    .upsert(
      {
        ...parsed,
        family_id: profile.family_id,
        deleted_at: null,
      },
      { onConflict: "diagnosis_id,linked_type,linked_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeEvidenceLinkRow(data as EvidenceLinkRow);
}

export async function listEvidenceLinks(
  input: EvidenceLinkFilter,
  supabase: SupabaseClient,
): Promise<{
  items: EvidenceLink[];
  next_cursor: string | null;
  page_size: number;
}> {
  const parsed = evidenceLinkFilterSchema.parse(input);
  const pageSize = parsed.page_size ?? DEFAULT_PAGE_SIZE;
  await requireCurrentProfile(supabase);

  let query = supabase
    .from("evidence_links")
    .select("*")
    .eq("diagnosis_id", parsed.diagnosis_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);

  if (parsed.cursor) {
    query = query.lt("created_at", parsed.cursor);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = ((data ?? []) as EvidenceLinkRow[]).map(
    normalizeEvidenceLinkRow,
  );
  const items = rows.slice(0, pageSize);
  const overflow = rows[pageSize];

  return {
    items,
    next_cursor: overflow ? overflow.created_at : null,
    page_size: pageSize,
  };
}

export async function updateEvidenceLink(
  input: UpdateEvidenceLinkInput,
  supabase: SupabaseClient,
): Promise<EvidenceLink> {
  const parsed = updateEvidenceLinkInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);
  const { id, ...patch } = parsed;

  const { data, error } = await supabase
    .from("evidence_links")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeEvidenceLinkRow(data as EvidenceLinkRow);
}

export async function removeEvidenceLink(
  id: string,
  supabase: SupabaseClient,
): Promise<EvidenceLink> {
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("evidence_links")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeEvidenceLinkRow(data as EvidenceLinkRow);
}

async function moveEvidenceLinksToTarget(
  familyId: string,
  sourceIds: string[],
  targetId: string,
  rationale: string,
  supabase: SupabaseClient,
) {
  const { data, error } = await supabase
    .from("evidence_links")
    .select("*")
    .in("diagnosis_id", sourceIds)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }

  const sourceLinks = (data ?? []) as EvidenceLinkRow[];
  const movedLinks = sourceLinks.map((row) => ({
    family_id: familyId,
    diagnosis_id: targetId,
    linked_type: row.linked_type,
    linked_id: row.linked_id,
    direction: row.direction,
    note: row.note ? `${row.note}\n\nMerged: ${rationale}` : rationale,
    deleted_at: null,
  }));

  if (movedLinks.length > 0) {
    const { error: upsertError } = await supabase
      .from("evidence_links")
      .upsert(movedLinks, {
        onConflict: "diagnosis_id,linked_type,linked_id",
      });

    if (upsertError) {
      throw upsertError;
    }

    const { error: deleteError } = await supabase
      .from("evidence_links")
      .update({ deleted_at: new Date().toISOString() })
      .in(
        "id",
        sourceLinks.map((row) => String(row.id)),
      );

    if (deleteError) {
      throw deleteError;
    }
  }

  return movedLinks.length;
}

export async function mergeDiagnosisNodes(
  input: MergeDiagnosisNodesInput,
  supabase: SupabaseClient,
): Promise<DiagnosisMergeResult> {
  const parsed = mergeDiagnosisNodesInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const target = await getDiagnosis(parsed.target_diagnosis_id, supabase);
  const sourceIds = parsed.source_diagnosis_ids.filter(
    (id) => id !== target.id,
  );

  if (sourceIds.length === 0) {
    throw new Error("At least one source diagnosis must differ from target");
  }

  const { data: sourceRows, error: sourceError } = await supabase
    .from("diagnoses")
    .select("*")
    .in("id", sourceIds)
    .is("deleted_at", null);

  if (sourceError) {
    throw sourceError;
  }

  const sources = ((sourceRows ?? []) as DiagnosisRow[]).map(
    normalizeDiagnosisRow,
  );

  if (sources.length !== sourceIds.length) {
    throw new NotFoundError("One or more source diagnoses were not found");
  }

  const evidenceLinksMoved = await moveEvidenceLinksToTarget(
    profile.family_id,
    sourceIds,
    target.id,
    parsed.rationale,
    supabase,
  );

  const deletedAt = new Date().toISOString();
  const { error: deleteError } = await supabase
    .from("diagnoses")
    .update({ deleted_at: deletedAt })
    .in("id", sourceIds);

  if (deleteError) {
    throw deleteError;
  }

  await recordDiagnosticAudit(
    "merge",
    target.id,
    { sources, target },
    {
      target_id: target.id,
      source_ids: sourceIds,
      rationale: parsed.rationale,
    },
    supabase,
  );

  return diagnosisMergeResultSchema.parse({
    target: await getDiagnosis(target.id, supabase),
    merged_sources: sources,
    evidence_links_moved: evidenceLinksMoved,
  });
}

export async function splitDiagnosisNode(
  input: SplitDiagnosisNodeInput,
  supabase: SupabaseClient,
): Promise<DiagnosisSplitResult> {
  const parsed = splitDiagnosisNodeInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);
  const source = await getDiagnosis(parsed.source_diagnosis_id, supabase);

  const { data, error } = await supabase
    .from("diagnoses")
    .insert(
      parsed.new_nodes.map((node) => ({
        ...node,
        family_id: profile.family_id,
        user_id: profile.id,
        parent_diagnosis_id:
          node.parent_diagnosis_id ?? parsed.source_diagnosis_id,
      })),
    )
    .select("*");

  if (error) {
    throw error;
  }

  const createdNodes = ((data ?? []) as DiagnosisRow[]).map(
    normalizeDiagnosisRow,
  );

  await recordDiagnosticAudit(
    "split",
    source.id,
    { source },
    {
      source_id: source.id,
      created_node_ids: createdNodes.map((node) => node.id),
      rationale: parsed.rationale,
    },
    supabase,
  );

  return diagnosisSplitResultSchema.parse({
    source,
    created_nodes: createdNodes,
  });
}
