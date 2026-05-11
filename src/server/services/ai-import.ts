import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { ZodError, type ZodTypeAny } from "zod";
import {
  DEFAULT_PAGE_SIZE,
  aiImportDraftFilterSchema,
  aiImportDraftSchema,
  aiImportExtractionResultSchema,
  aiImportSessionFilterSchema,
  aiImportSessionSchema,
  aiImportSessionWithDraftsSchema,
  analyzeAiImportSessionInputSchema,
  analyzeAiImportTextInputSchema,
  commitAiImportDraftInputSchema,
  createAiImportSessionInputSchema,
  createAppointmentInputSchema,
  createDecisionInputSchema,
  createEntryInputSchema,
  createMedicationInputSchema,
  createMedicationResponseInputSchema,
  createProcedureEventInputSchema,
  createSourceInputSchema,
  createTaskInputSchema,
  rejectAiImportDraftInputSchema,
  updateAiImportDraftInputSchema,
  type AiImportCommitResult,
  type AiImportDraft,
  type AiImportDraftFilter,
  type AiImportExtractedDraft,
  type AiImportExtractionResult,
  type AiImportSession,
  type AiImportSessionFilter,
  type AiImportSessionWithDrafts,
  type AiImportTargetType,
  type AnalyzeAiImportTextInput,
  type CommitAiImportDraftInput,
  type CreateAiImportSessionInput,
  type RejectAiImportDraftInput,
  type UpdateAiImportDraftInput,
} from "@/server/contracts";
import { createDecision, linkDecisionEvidence } from "./decisions";
import { createEntry } from "./entries";
import { createMedication, createMedicationResponse } from "./medications";
import { createProcedureEvent } from "./procedures";
import { createAppointment, createTask } from "./schedule";
import { createSource, getSource } from "./sources";
import { assertCanWrite, requireCurrentProfile } from "./auth";
import { NotFoundError } from "./errors";
import type { SupabaseClient } from "@supabase/supabase-js";

type Row = Record<string, unknown>;

type PaginatedAiImportSessions = {
  items: AiImportSession[];
  next_cursor: string | null;
  page_size: number;
};

type PaginatedAiImportDrafts = {
  items: AiImportDraft[];
  next_cursor: string | null;
  page_size: number;
};

type AiImportExtractorInput = {
  input_text: string;
  requested_target_types: AiImportTargetType[];
  source_context?: {
    id: string;
    title: string;
    source_type: string;
    source_date: string | null;
    provider: string | null;
    citation: string | null;
    summary: string | null;
  };
  model: string;
};

export type AiImportExtractor = (
  input: AiImportExtractorInput,
) => Promise<AiImportExtractionResult>;

const PROMPT_VERSION = "ai-import-v1";
const DEFAULT_AI_IMPORT_MODEL = "gpt-5.4-mini";

const TARGET_SCHEMAS: Record<AiImportTargetType, ZodTypeAny> = {
  entry: createEntryInputSchema,
  procedure_event: createProcedureEventInputSchema,
  source: createSourceInputSchema,
  medication: createMedicationInputSchema,
  medication_response: createMedicationResponseInputSchema,
  appointment: createAppointmentInputSchema,
  task: createTaskInputSchema,
  decision: createDecisionInputSchema,
};

const TARGET_SUMMARY = {
  entry:
    "Pain/log entry. Use for symptoms, flares, pain scores, triggers, function impact, interventions tried, and freeform daily notes.",
  procedure_event:
    "Timeline event. Use for procedures, diagnostic tests, imaging, consultations, ED visits, surgeries, and procedure-impact history.",
  source:
    "Source-library record. Use for a document, portal note, report, literature item, or other source that should be preserved and linked later.",
  medication:
    "Medication record. Use for current/planned/stopped medications and standing prescriptions.",
  medication_response:
    "Medication response. Use for a specific taken dose and observed pain/sedation/cognition/gait response over time.",
  appointment:
    "Scheduled/completed appointment. Use for provider visits, prep questions, after-visit summaries, and follow-up tasks.",
  task: "Task or follow-up item. Use for scheduling, records requests, clinician messages, packet prep, and decision follow-up.",
  decision:
    "Decision tracker item. Use for unresolved care decisions, options, risks, evidence, and what would change the decision.",
} satisfies Record<AiImportTargetType, string>;

function modelFromEnv() {
  return (
    process.env.AI_IMPORT_MODEL ||
    process.env.OPENAI_MODEL ||
    DEFAULT_AI_IMPORT_MODEL
  );
}

function titleFromPayload(payload: Record<string, unknown>) {
  const title = payload.title ?? payload.purpose ?? payload.name;
  return typeof title === "string" && title.trim() ? title.trim() : null;
}

function zodIssues(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export function validateAiImportDraftPayload(
  targetType: AiImportTargetType,
  payload: unknown,
) {
  const schema = TARGET_SCHEMAS[targetType];
  const result = schema.safeParse(payload);

  if (result.success) {
    return {
      ok: true as const,
      payload: result.data as Record<string, unknown>,
      validation_errors: [],
    };
  }

  return {
    ok: false as const,
    payload: payload as Record<string, unknown>,
    validation_errors: zodIssues(result.error),
  };
}

export function normalizeAiImportSessionRow(row: Row): AiImportSession {
  return aiImportSessionSchema.parse({
    ...row,
    source_id: row.source_id ?? null,
    agent_thread_id: row.agent_thread_id ?? null,
    input_label: row.input_label ?? null,
    requested_target_types: Array.isArray(row.requested_target_types)
      ? row.requested_target_types
      : [],
    model: row.model ?? null,
    error_message: row.error_message ?? null,
    deleted_at: row.deleted_at ?? null,
  });
}

export function normalizeAiImportDraftRow(row: Row): AiImportDraft {
  return aiImportDraftSchema.parse({
    ...row,
    agent_thread_id: row.agent_thread_id ?? null,
    title: row.title ?? null,
    proposed_payload:
      row.proposed_payload && typeof row.proposed_payload === "object"
        ? row.proposed_payload
        : {},
    missing_fields: Array.isArray(row.missing_fields) ? row.missing_fields : [],
    evidence_spans: Array.isArray(row.evidence_spans) ? row.evidence_spans : [],
    warnings: Array.isArray(row.warnings) ? row.warnings : [],
    validation_errors: Array.isArray(row.validation_errors)
      ? row.validation_errors
      : [],
    committed_entity_type: row.committed_entity_type ?? null,
    committed_entity_id: row.committed_entity_id ?? null,
    committed_at: row.committed_at ?? null,
    rejected_reason: row.rejected_reason ?? null,
    deleted_at: row.deleted_at ?? null,
  });
}

function systemPrompt() {
  return [
    "You extract reviewable records for a private family medical tracking app.",
    "Do not diagnose, do not infer unsupported medical conclusions, and do not invent dates, scores, providers, UUIDs, or body-region IDs.",
    "If a required field is absent or ambiguous, omit it from proposed_payload and list it in missing_fields.",
    "Use UTC ISO timestamps for known dates/times. For known date-only records, use 12:00:00.000Z.",
    "Every clinically important field must have a short evidence_spans quote from the input text.",
    "Prefer fewer, higher-quality drafts over many speculative drafts.",
    "All drafts are proposals only; a human will review and edit before commit.",
  ].join("\n");
}

function extractionInstructions(input: AiImportExtractorInput) {
  const requested = input.requested_target_types.length
    ? input.requested_target_types
    : (Object.keys(TARGET_SUMMARY) as AiImportTargetType[]);
  const sourceContext = input.source_context
    ? [
        "Source context:",
        `- id: ${input.source_context.id}`,
        `- title: ${input.source_context.title}`,
        `- type: ${input.source_context.source_type}`,
        `- date: ${input.source_context.source_date ?? "unknown"}`,
        `- provider: ${input.source_context.provider ?? "unknown"}`,
        `- citation: ${input.source_context.citation ?? "unknown"}`,
        `- summary: ${input.source_context.summary ?? "none"}`,
        "",
      ].join("\n")
    : "";

  return [
    sourceContext,
    "Allowed draft target types and intended use:",
    ...requested.map((target) => `- ${target}: ${TARGET_SUMMARY[target]}`),
    "",
    "Target payload guidance:",
    "- entry: include type, occurred_at, title, notes, pain_current/pain_peak/pain_average if explicit, function_impact, interventions_tried, response, is_flare, flare_status, recovery_minutes. Do not include body_region_ids, symptom ids, trigger ids, or primary_trigger_id unless explicit UUIDs are provided.",
    "- procedure_event: include type, occurred_at, title, summary, provider, location, diagnostic_question, baseline_before, immediate_effect, effect_24h, effect_72h, effect_1w, effect_1m, new_symptoms, answered_question, repeat_recommendation. Use type consult/imaging/test_lab/procedure/procedure_test as appropriate.",
    "- source: include title, source_type, source_date, provider, citation, summary, tags. Use source_type visit_note/imaging_report/lab_report/generated_report/literature/upload/other.",
    "- medication: include name, dose, route, frequency, start_date, stop_date, prescriber, reason, status, helped_* booleans, side_effects, notes when explicit.",
    "- medication_response: include taken_at, reason, pain_before, pain_after_30m, pain_after_60m, pain_after_120m, sedation_effect, cognition_effect, gait_effect, side_effects, helped, notes. Do not invent medication_id or entry_id.",
    "- appointment: include date_time, provider, specialty, location, location_url, purpose, prep_notes, questions, files_to_show, decisions_needed, after_visit_summary, follow_up_tasks, status.",
    "- task: include title, status, priority, due_at, notes. Do not invent linked IDs.",
    "- decision: include title, status, question, options, evidence_for, evidence_against, risks, what_would_change, owner, target_date, final_decision, rationale.",
    "",
    "Unstructured input:",
    input.input_text,
  ].join("\n");
}

/**
 * Test-mode override used by Playwright Tier-2 smokes. When set, the
 * extractor below returns a small deterministic draft set instead of
 * calling OpenAI, so smoke tests can exercise `/import` without requiring
 * an OPENAI_API_KEY.
 *
 * Production deploys MUST NOT set this. The fake's payload is intentionally
 * minimal — it documents that "the agent created a draft for you to
 * review", which is exactly the safety boundary we want to assert in
 * smokes.
 */
const BELLA_E2E_IMPORT_FAKE_ENV = "BELLA_E2E_AGENT_FAKE";

export function isAiImportFakeMode(): boolean {
  return process.env[BELLA_E2E_IMPORT_FAKE_ENV] === "1";
}

export async function extractAiImportDraftsFake(
  input: AiImportExtractorInput,
): Promise<AiImportExtractionResult> {
  void input;
  return aiImportExtractionResultSchema.parse({
    drafts: [
      {
        target_type: "entry",
        proposed_payload: {
          type: "freeform",
          occurred_at: new Date().toISOString(),
          title: "[fake] AI smoke draft",
          notes: "Synthetic draft generated by the Bella e2e fake.",
          function_impact: [],
          interventions_tried: [],
          is_flare: false,
          body_region_ids: [],
          symptoms: [],
          triggers: [],
        },
        confidence: "low",
        missing_fields: ["body_region_ids", "primary_trigger_id"],
        evidence_spans: [
          {
            field: "notes",
            quote: "Synthetic e2e quote — no real PHI.",
          },
        ],
        warnings: ["This draft was generated by the e2e fake."],
      },
    ],
  });
}

export async function extractAiImportDraftsWithOpenAI(
  input: AiImportExtractorInput,
): Promise<AiImportExtractionResult> {
  if (isAiImportFakeMode()) {
    return extractAiImportDraftsFake(input);
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for AI import extraction");
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.responses.parse({
    model: input.model,
    input: [
      { role: "system", content: systemPrompt() },
      { role: "user", content: extractionInstructions(input) },
    ],
    text: {
      format: zodTextFormat(aiImportExtractionResultSchema, "ai_import"),
    },
  });

  return aiImportExtractionResultSchema.parse(response.output_parsed);
}

async function getSourceContext(
  sourceId: string | undefined,
  supabase: SupabaseClient,
) {
  if (!sourceId) return undefined;
  const source = await getSource(sourceId, supabase);
  return {
    id: source.id,
    title: source.title,
    source_type: source.source_type,
    source_date: source.source_date,
    provider: source.provider,
    citation: source.citation,
    summary: source.summary,
  };
}

export async function createAiImportSession(
  input: CreateAiImportSessionInput,
  supabase: SupabaseClient,
): Promise<AiImportSession> {
  const parsed = createAiImportSessionInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("ai_import_sessions")
    .insert({
      family_id: profile.family_id,
      user_id: profile.id,
      source_id: parsed.source_id,
      input_label: parsed.input_label,
      raw_text: parsed.input_text,
      requested_target_types: parsed.requested_target_types,
      status: "drafting",
      prompt_version: PROMPT_VERSION,
    })
    .select("*")
    .single();

  if (error) throw error;
  return normalizeAiImportSessionRow(data as Row);
}

function draftRowFromExtraction(
  extracted: AiImportExtractedDraft,
  session: AiImportSession,
  userId: string,
) {
  const validation = validateAiImportDraftPayload(
    extracted.target_type,
    extracted.proposed_payload,
  );
  const payload =
    validation.ok && validation.payload
      ? validation.payload
      : extracted.proposed_payload;

  return {
    family_id: session.family_id,
    user_id: userId,
    session_id: session.id,
    target_type: extracted.target_type,
    status: "proposed",
    title: titleFromPayload(payload),
    proposed_payload: payload,
    confidence: extracted.confidence,
    missing_fields: extracted.missing_fields,
    evidence_spans: extracted.evidence_spans,
    warnings: [
      ...extracted.warnings,
      ...(validation.ok ? [] : ["Draft requires edits before commit."]),
    ],
    validation_errors: validation.validation_errors,
  };
}

async function replaceDraftsForSession(
  session: AiImportSession,
  extraction: AiImportExtractionResult,
  supabase: SupabaseClient,
) {
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { error: deleteError } = await supabase
    .from("ai_import_drafts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("session_id", session.id)
    .eq("status", "proposed");

  if (deleteError) throw deleteError;

  if (extraction.drafts.length === 0) {
    return [];
  }

  const rows = extraction.drafts.map((draft) =>
    draftRowFromExtraction(draft, session, profile.id),
  );

  const { data, error } = await supabase
    .from("ai_import_drafts")
    .insert(rows)
    .select("*");

  if (error) throw error;
  return ((data ?? []) as Row[]).map(normalizeAiImportDraftRow);
}

export async function analyzeAiImportSession(
  input: { session_id: string; model?: string },
  supabase: SupabaseClient,
  extractor: AiImportExtractor = extractAiImportDraftsWithOpenAI,
): Promise<AiImportSessionWithDrafts> {
  const parsed = analyzeAiImportSessionInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const session = await getAiImportSession(parsed.session_id, supabase);
  const model = input.model ?? session.model ?? modelFromEnv();
  const sourceContext = await getSourceContext(
    session.source_id ?? undefined,
    supabase,
  );

  try {
    const extraction = aiImportExtractionResultSchema.parse(
      await extractor({
        input_text: session.raw_text,
        requested_target_types: session.requested_target_types,
        source_context: sourceContext,
        model,
      }),
    );
    const drafts = await replaceDraftsForSession(session, extraction, supabase);
    const { data, error } = await supabase
      .from("ai_import_sessions")
      .update({
        status: "ready_for_review",
        model,
        prompt_version: PROMPT_VERSION,
        error_message: null,
      })
      .eq("id", session.id)
      .select("*")
      .single();

    if (error) throw error;

    return aiImportSessionWithDraftsSchema.parse({
      session: normalizeAiImportSessionRow(data as Row),
      drafts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI import failed";
    await supabase
      .from("ai_import_sessions")
      .update({ status: "failed", model, error_message: message })
      .eq("id", session.id);
    throw error;
  }
}

export async function analyzeAiImportText(
  input: AnalyzeAiImportTextInput,
  supabase: SupabaseClient,
  extractor: AiImportExtractor = extractAiImportDraftsWithOpenAI,
): Promise<AiImportSessionWithDrafts> {
  const parsed = analyzeAiImportTextInputSchema.parse(input);
  const session = await createAiImportSession(parsed, supabase);
  return analyzeAiImportSession(
    { session_id: session.id, model: parsed.model },
    supabase,
    extractor,
  );
}

export async function getAiImportSession(
  id: string,
  supabase: SupabaseClient,
): Promise<AiImportSession> {
  await requireCurrentProfile(supabase);

  const { data, error } = await supabase
    .from("ai_import_sessions")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) throw error;
  if (!data) throw new NotFoundError("AI import session not found");
  return normalizeAiImportSessionRow(data as Row);
}

export async function getAiImportDraft(
  id: string,
  supabase: SupabaseClient,
): Promise<AiImportDraft> {
  await requireCurrentProfile(supabase);

  const { data, error } = await supabase
    .from("ai_import_drafts")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) throw error;
  if (!data) throw new NotFoundError("AI import draft not found");
  return normalizeAiImportDraftRow(data as Row);
}

export async function listAiImportSessions(
  input: AiImportSessionFilter,
  supabase: SupabaseClient,
): Promise<PaginatedAiImportSessions> {
  const parsed = aiImportSessionFilterSchema.parse(input);
  const pageSize = parsed.page_size ?? DEFAULT_PAGE_SIZE;
  await requireCurrentProfile(supabase);

  let query = supabase
    .from("ai_import_sessions")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);

  if (parsed.cursor) query = query.lt("created_at", parsed.cursor);
  if (parsed.status) query = query.eq("status", parsed.status);
  if (parsed.agent_thread_id)
    query = query.eq("agent_thread_id", parsed.agent_thread_id);

  const { data, error } = await query;
  if (error) throw error;

  const rows = ((data ?? []) as Row[]).map(normalizeAiImportSessionRow);
  const items = rows.slice(0, pageSize);
  const overflow = rows[pageSize];

  return {
    items,
    next_cursor: overflow ? overflow.created_at : null,
    page_size: pageSize,
  };
}

export async function listAiImportDrafts(
  input: AiImportDraftFilter,
  supabase: SupabaseClient,
): Promise<PaginatedAiImportDrafts> {
  const parsed = aiImportDraftFilterSchema.parse(input);
  const pageSize = parsed.page_size ?? DEFAULT_PAGE_SIZE;
  await requireCurrentProfile(supabase);

  let query = supabase
    .from("ai_import_drafts")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);

  if (parsed.cursor) query = query.lt("created_at", parsed.cursor);
  if (parsed.session_id) query = query.eq("session_id", parsed.session_id);
  if (parsed.status) query = query.eq("status", parsed.status);
  if (parsed.target_type) query = query.eq("target_type", parsed.target_type);
  if (parsed.agent_thread_id)
    query = query.eq("agent_thread_id", parsed.agent_thread_id);

  const { data, error } = await query;
  if (error) throw error;

  const rows = ((data ?? []) as Row[]).map(normalizeAiImportDraftRow);
  const items = rows.slice(0, pageSize);
  const overflow = rows[pageSize];

  return {
    items,
    next_cursor: overflow ? overflow.created_at : null,
    page_size: pageSize,
  };
}

export async function updateAiImportDraft(
  input: UpdateAiImportDraftInput,
  supabase: SupabaseClient,
): Promise<AiImportDraft> {
  const parsed = updateAiImportDraftInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);
  const existing = await getAiImportDraft(parsed.id, supabase);

  if (existing.status !== "proposed") {
    throw new Error("Only proposed AI import drafts can be edited");
  }

  const targetType = parsed.target_type ?? existing.target_type;
  const payload = parsed.proposed_payload ?? existing.proposed_payload;
  const validation = validateAiImportDraftPayload(targetType, payload);
  const normalizedPayload =
    validation.ok && validation.payload ? validation.payload : payload;

  const { data, error } = await supabase
    .from("ai_import_drafts")
    .update({
      target_type: targetType,
      proposed_payload: normalizedPayload,
      title: titleFromPayload(normalizedPayload),
      confidence: parsed.confidence ?? existing.confidence,
      missing_fields: parsed.missing_fields ?? existing.missing_fields,
      evidence_spans: parsed.evidence_spans ?? existing.evidence_spans,
      warnings: parsed.warnings ?? existing.warnings,
      validation_errors: validation.validation_errors,
    })
    .eq("id", existing.id)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeAiImportDraftRow(data as Row);
}

export async function rejectAiImportDraft(
  input: RejectAiImportDraftInput,
  supabase: SupabaseClient,
): Promise<AiImportDraft> {
  const parsed = rejectAiImportDraftInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("ai_import_drafts")
    .update({
      status: "rejected",
      rejected_reason: parsed.reason,
    })
    .eq("id", parsed.id)
    .eq("status", "proposed")
    .select("*")
    .single();

  if (error) throw error;
  const draft = normalizeAiImportDraftRow(data as Row);
  await refreshSessionStatus(draft.session_id, supabase);
  return draft;
}

async function commitPayload(
  draft: AiImportDraft,
  session: AiImportSession,
  supabase: SupabaseClient,
) {
  const sourceId = session.source_id ?? undefined;
  const payload = { ...draft.proposed_payload };

  if (
    sourceId &&
    (draft.target_type === "procedure_event" || draft.target_type === "task") &&
    typeof payload.source_id !== "string"
  ) {
    payload.source_id = sourceId;
  }

  switch (draft.target_type) {
    case "entry": {
      const entity = await createEntry(
        payload as Parameters<typeof createEntry>[0],
        supabase,
      );
      return { entity_type: draft.target_type, entity_id: entity.id };
    }
    case "procedure_event": {
      const entity = await createProcedureEvent(
        payload as Parameters<typeof createProcedureEvent>[0],
        supabase,
      );
      return { entity_type: draft.target_type, entity_id: entity.id };
    }
    case "source": {
      const entity = await createSource(
        payload as Parameters<typeof createSource>[0],
        supabase,
      );
      return { entity_type: draft.target_type, entity_id: entity.id };
    }
    case "medication": {
      const entity = await createMedication(
        payload as Parameters<typeof createMedication>[0],
        supabase,
      );
      return { entity_type: draft.target_type, entity_id: entity.id };
    }
    case "medication_response": {
      const entity = await createMedicationResponse(
        payload as Parameters<typeof createMedicationResponse>[0],
        supabase,
      );
      return { entity_type: draft.target_type, entity_id: entity.id };
    }
    case "appointment": {
      const entity = await createAppointment(
        payload as Parameters<typeof createAppointment>[0],
        supabase,
      );
      return { entity_type: draft.target_type, entity_id: entity.id };
    }
    case "task": {
      const entity = await createTask(
        payload as Parameters<typeof createTask>[0],
        supabase,
      );
      return { entity_type: draft.target_type, entity_id: entity.id };
    }
    case "decision": {
      const entity = await createDecision(
        payload as Parameters<typeof createDecision>[0],
        supabase,
      );
      if (sourceId) {
        await linkDecisionEvidence(
          {
            decision_id: entity.id,
            linked_type: "source",
            linked_id: sourceId,
            note: "Linked from AI import source context.",
          },
          supabase,
        );
      }
      return { entity_type: draft.target_type, entity_id: entity.id };
    }
  }
}

async function refreshSessionStatus(
  sessionId: string,
  supabase: SupabaseClient,
) {
  const { data, error } = await supabase
    .from("ai_import_drafts")
    .select("status")
    .eq("session_id", sessionId)
    .is("deleted_at", null);

  if (error) throw error;

  const statuses = (data ?? []).map((row) => String(row.status));
  const hasOpenDraft = statuses.some((status) =>
    ["proposed", "failed"].includes(status),
  );
  const hasCommittedDraft = statuses.includes("committed");
  const nextStatus =
    statuses.length > 0 && !hasOpenDraft && hasCommittedDraft
      ? "committed"
      : statuses.length > 0 && statuses.every((status) => status === "rejected")
        ? "rejected"
        : "ready_for_review";

  const { error: updateError } = await supabase
    .from("ai_import_sessions")
    .update({ status: nextStatus })
    .eq("id", sessionId);

  if (updateError) throw updateError;
}

export async function commitAiImportDraft(
  input: CommitAiImportDraftInput,
  supabase: SupabaseClient,
): Promise<AiImportCommitResult> {
  const parsed = commitAiImportDraftInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const draft = await getAiImportDraft(parsed.id, supabase);
  if (draft.status !== "proposed") {
    throw new Error("Only proposed AI import drafts can be committed");
  }

  const validation = validateAiImportDraftPayload(
    draft.target_type,
    draft.proposed_payload,
  );
  if (!validation.ok) {
    await supabase
      .from("ai_import_drafts")
      .update({ validation_errors: validation.validation_errors })
      .eq("id", draft.id);
    throw new Error("AI import draft payload is invalid and needs review");
  }

  const session = await getAiImportSession(draft.session_id, supabase);

  try {
    const committed = await commitPayload(draft, session, supabase);
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("ai_import_drafts")
      .update({
        status: "committed",
        proposed_payload: validation.payload,
        validation_errors: [],
        committed_entity_type: committed.entity_type,
        committed_entity_id: committed.entity_id,
        committed_at: now,
      })
      .eq("id", draft.id)
      .select("*")
      .single();

    if (error) throw error;
    const committedDraft = normalizeAiImportDraftRow(data as Row);
    await refreshSessionStatus(session.id, supabase);

    return {
      draft: committedDraft,
      committed_entity_type: committed.entity_type,
      committed_entity_id: committed.entity_id,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI import commit failed";
    await supabase
      .from("ai_import_drafts")
      .update({
        status: "failed",
        warnings: [...draft.warnings, message],
      })
      .eq("id", draft.id);
    throw error;
  }
}
