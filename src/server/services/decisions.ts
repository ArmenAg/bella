import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_PAGE_SIZE,
  createDecisionInputSchema,
  decisionEvidenceLinkSchema,
  decisionFilterSchema,
  decisionSchema,
  linkDecisionEvidenceInputSchema,
  updateDecisionInputSchema,
  type CreateDecisionInput,
  type Decision,
  type DecisionEvidenceLink,
  type DecisionFilter,
  type LinkDecisionEvidenceInput,
  type UpdateDecisionInput,
} from "@/server/contracts";
import { recordSoftDeleteReason } from "./audit";
import { assertCanWrite, requireCurrentProfile } from "./auth";

type DecisionRow = Record<string, unknown>;
type DecisionEvidenceLinkRow = Record<string, unknown>;

type PaginatedDecisions = {
  items: Decision[];
  next_cursor: string | null;
  page_size: number;
};

const OPEN_DECISION_STATUSES = [
  "open",
  "waiting_on_test",
  "waiting_on_clinician",
  "revisiting",
];

function normalizeDecisionRow(row: DecisionRow): Decision {
  return decisionSchema.parse({
    ...row,
    options: Array.isArray(row.options) ? row.options : [],
    evidence_for: row.evidence_for ?? null,
    evidence_against: row.evidence_against ?? null,
    risks: row.risks ?? null,
    what_would_change: row.what_would_change ?? null,
    owner: row.owner ?? null,
    target_date: row.target_date ?? null,
    final_decision: row.final_decision ?? null,
    rationale: row.rationale ?? null,
    deleted_at: row.deleted_at ?? null,
  });
}

export function normalizeDecisionEvidenceLinkRow(
  row: DecisionEvidenceLinkRow,
): DecisionEvidenceLink {
  return decisionEvidenceLinkSchema.parse({
    ...row,
    note: row.note ?? null,
    deleted_at: row.deleted_at ?? null,
  });
}

export async function createDecision(
  input: CreateDecisionInput,
  supabase: SupabaseClient,
): Promise<Decision> {
  const parsed = createDecisionInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("decisions")
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

  return normalizeDecisionRow(data as DecisionRow);
}

export async function updateDecision(
  input: UpdateDecisionInput,
  supabase: SupabaseClient,
): Promise<Decision> {
  const parsed = updateDecisionInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);
  const { id, ...patch } = parsed;

  const { data, error } = await supabase
    .from("decisions")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeDecisionRow(data as DecisionRow);
}

export async function softDeleteDecision(
  id: string,
  reason: string,
  supabase: SupabaseClient,
): Promise<Decision> {
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("decisions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await recordSoftDeleteReason("decisions", id, reason, supabase);

  return normalizeDecisionRow(data as DecisionRow);
}

export async function getDecision(
  id: string,
  supabase: SupabaseClient,
): Promise<Decision> {
  await requireCurrentProfile(supabase);

  const { data, error } = await supabase
    .from("decisions")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Decision not found");
  }

  return normalizeDecisionRow(data as DecisionRow);
}

export async function listDecisions(
  input: DecisionFilter,
  supabase: SupabaseClient,
): Promise<PaginatedDecisions> {
  const parsed = decisionFilterSchema.parse(input);
  const pageSize = parsed.page_size ?? DEFAULT_PAGE_SIZE;

  let query = supabase
    .from("decisions")
    .select("*")
    .is("deleted_at", null)
    .order("target_date", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(pageSize + 1);

  if (parsed.cursor) {
    query = query.lt("updated_at", parsed.cursor);
  }

  if (parsed.status) {
    query = query.eq("status", parsed.status);
  } else if (parsed.open_only) {
    query = query.in("status", OPEN_DECISION_STATUSES);
  }

  if (parsed.target_date_from) {
    query = query.gte("target_date", parsed.target_date_from);
  }

  if (parsed.target_date_to) {
    query = query.lte("target_date", parsed.target_date_to);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = ((data ?? []) as DecisionRow[]).map(normalizeDecisionRow);
  const items = rows.slice(0, pageSize);
  const overflow = rows[pageSize];

  return {
    items,
    next_cursor: overflow ? overflow.updated_at : null,
    page_size: pageSize,
  };
}

export async function linkDecisionEvidence(
  input: LinkDecisionEvidenceInput,
  supabase: SupabaseClient,
): Promise<DecisionEvidenceLink> {
  const parsed = linkDecisionEvidenceInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("decision_evidence_links")
    .upsert(
      {
        ...parsed,
        family_id: profile.family_id,
        deleted_at: null,
      },
      { onConflict: "decision_id,linked_type,linked_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeDecisionEvidenceLinkRow(data as DecisionEvidenceLinkRow);
}
