import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_PAGE_SIZE,
  attachFileToSourceInputSchema,
  createSourceInputSchema,
  linkSourceToDecisionInputSchema,
  linkSourceToDiagnosisInputSchema,
  linkSourceToEventInputSchema,
  sourceFilterSchema,
  sourceSchema,
  sourceLinksSchema,
  updateSourceInputSchema,
  type AttachFileToSourceInput,
  type LinkSourceToDecisionInput,
  type LinkSourceToDiagnosisInput,
  type LinkSourceToEventInput,
  type CreateSourceInput,
  type Source,
  type SourceFilter,
  type SourceLinks,
  type UpdateSourceInput,
  type AttachmentLinkDTO,
  type DecisionEvidenceLink,
  type EvidenceLink,
  type ProcedureEvent,
} from "@/server/contracts";
import { recordSoftDeleteReason } from "./audit";
import { assertCanWrite, requireCurrentProfile } from "./auth";
import { NotFoundError } from "./errors";
import { linkAttachment } from "./attachments";
import {
  linkDecisionEvidence,
  normalizeDecisionEvidenceLinkRow,
} from "./decisions";
import { createEvidenceLink, normalizeEvidenceLinkRow } from "./diagnoses";
import { normalizeProcedureEventRow } from "./procedures";

type Row = Record<string, unknown>;

type PaginatedSources = {
  items: Source[];
  next_cursor: string | null;
  page_size: number;
};

export function normalizeSourceRow(row: Row): Source {
  return sourceSchema.parse({
    ...row,
    source_date: row.source_date ?? null,
    provider: row.provider ?? null,
    citation: row.citation ?? null,
    summary: row.summary ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    url: row.url ?? null,
    deleted_at: row.deleted_at ?? null,
  });
}

export async function createSource(
  input: CreateSourceInput,
  supabase: SupabaseClient,
): Promise<Source> {
  const parsed = createSourceInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("sources")
    .insert({ ...parsed, family_id: profile.family_id, user_id: profile.id })
    .select("*")
    .single();

  if (error) throw error;
  return normalizeSourceRow(data as Row);
}

export async function updateSource(
  input: UpdateSourceInput,
  supabase: SupabaseClient,
): Promise<Source> {
  const parsed = updateSourceInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);
  const { id, ...patch } = parsed;

  const { data, error } = await supabase
    .from("sources")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeSourceRow(data as Row);
}

export async function softDeleteSource(
  id: string,
  reason: string,
  supabase: SupabaseClient,
): Promise<Source> {
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("sources")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  await recordSoftDeleteReason("sources", id, reason, supabase);
  return normalizeSourceRow(data as Row);
}

export async function getSource(
  id: string,
  supabase: SupabaseClient,
): Promise<Source> {
  await requireCurrentProfile(supabase);

  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) throw error;
  if (!data) throw new NotFoundError("Source not found");
  return normalizeSourceRow(data as Row);
}

export async function listSources(
  input: SourceFilter,
  supabase: SupabaseClient,
): Promise<PaginatedSources> {
  const parsed = sourceFilterSchema.parse(input);
  const pageSize = parsed.page_size ?? DEFAULT_PAGE_SIZE;

  let query = supabase
    .from("sources")
    .select("*")
    .is("deleted_at", null)
    .order("source_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(pageSize + 1);

  if (parsed.cursor) query = query.lt("created_at", parsed.cursor);
  if (parsed.source_type) query = query.eq("source_type", parsed.source_type);
  if (parsed.tag) query = query.contains("tags", [parsed.tag]);
  if (parsed.date_from) query = query.gte("source_date", parsed.date_from);
  if (parsed.date_to) query = query.lte("source_date", parsed.date_to);

  const { data, error } = await query;
  if (error) throw error;

  const rows = ((data ?? []) as Row[]).map(normalizeSourceRow);
  const items = rows.slice(0, pageSize);
  const overflow = rows[pageSize];

  return {
    items,
    next_cursor: overflow ? overflow.created_at : null,
    page_size: pageSize,
  };
}

export async function listSourceLinks(
  sourceId: string,
  supabase: SupabaseClient,
): Promise<SourceLinks> {
  await requireCurrentProfile(supabase);

  const [eventsResult, diagnosesResult, decisionsResult] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .eq("source_id", sourceId)
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false }),
    supabase
      .from("evidence_links")
      .select("*")
      .eq("linked_type", "source")
      .eq("linked_id", sourceId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    supabase
      .from("decision_evidence_links")
      .select("*")
      .eq("linked_type", "source")
      .eq("linked_id", sourceId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
  ]);

  if (eventsResult.error) throw eventsResult.error;
  if (diagnosesResult.error) throw diagnosesResult.error;
  if (decisionsResult.error) throw decisionsResult.error;

  return sourceLinksSchema.parse({
    source_id: sourceId,
    events: ((eventsResult.data ?? []) as Row[]).map(
      normalizeProcedureEventRow,
    ),
    diagnoses: ((diagnosesResult.data ?? []) as Row[]).map(
      normalizeEvidenceLinkRow,
    ),
    decisions: ((decisionsResult.data ?? []) as Row[]).map(
      normalizeDecisionEvidenceLinkRow,
    ),
  });
}

export async function linkSourceToEvent(
  input: LinkSourceToEventInput,
  supabase: SupabaseClient,
): Promise<ProcedureEvent> {
  const parsed = linkSourceToEventInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("events")
    .update({ source_id: parsed.source_id })
    .eq("id", parsed.event_id)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeProcedureEventRow(data as Row);
}

export async function linkSourceToDiagnosis(
  input: LinkSourceToDiagnosisInput,
  supabase: SupabaseClient,
): Promise<EvidenceLink> {
  const parsed = linkSourceToDiagnosisInputSchema.parse(input);

  return createEvidenceLink(
    {
      diagnosis_id: parsed.diagnosis_id,
      linked_type: "source",
      linked_id: parsed.source_id,
      direction: parsed.direction,
      note: parsed.note,
    },
    supabase,
  );
}

export async function linkSourceToDecision(
  input: LinkSourceToDecisionInput,
  supabase: SupabaseClient,
): Promise<DecisionEvidenceLink> {
  const parsed = linkSourceToDecisionInputSchema.parse(input);

  return linkDecisionEvidence(
    {
      decision_id: parsed.decision_id,
      linked_type: "source",
      linked_id: parsed.source_id,
      note: parsed.note,
    },
    supabase,
  );
}

export async function attachFileToSource(
  input: AttachFileToSourceInput,
  supabase: SupabaseClient,
): Promise<AttachmentLinkDTO> {
  const parsed = attachFileToSourceInputSchema.parse(input);

  return linkAttachment(
    {
      attachment_id: parsed.attachment_id,
      linked_type: "source",
      linked_id: parsed.source_id,
      label: parsed.label,
    },
    supabase,
  );
}
