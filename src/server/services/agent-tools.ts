import type { SupabaseClient } from "@supabase/supabase-js";
import { z, type ZodTypeAny } from "zod";
import {
  agentCaseSnapshotSchema,
  agentSearchRecordTypeSchema,
  agentSearchRecordsInputSchema,
  agentToolDraftCreateInputSchema,
  agentToolDraftRejectInputSchema,
  agentToolDraftUpdateInputSchema,
  agentToolNameSchema,
  dateSchema,
  decisionStatusSchema,
  entryTypeSchema,
  medicationStatusSchema,
  procedureEventTypeSchema,
  sourceTypeSchema,
  timelineItemTypeSchema,
  utcDateTimeSchema,
  uuidSchema,
  type AgentCaseSnapshot,
  type AgentThread,
  type AgentToolName,
  type AiImportDraft,
  type AiImportSession,
} from "@/server/contracts";
import {
  normalizeAiImportDraftRow,
  normalizeAiImportSessionRow,
  rejectAiImportDraft,
  updateAiImportDraft,
  validateAiImportDraftPayload,
} from "./ai-import";
import { assertCanWrite, requireCurrentProfile } from "./auth";
import { getDecision, listDecisions } from "./decisions";
import { NotFoundError } from "./errors";
import { getEntry, listEntries } from "./entries";
import {
  getMedication,
  getMedicationResponse,
  listMedicationResponses,
  listMedications,
} from "./medications";
import { getProcedureEvent, listProcedureEvents } from "./procedures";
import { listAppointments, listTasks } from "./schedule";
import { getSource, listSourceLinks, listSources } from "./sources";
import { listTimelineItems } from "./timeline";

type Row = Record<string, unknown>;

export type AgentToolContext = {
  supabase: SupabaseClient;
  thread: AgentThread;
};

export type AgentTool = {
  name: AgentToolName;
  description: string;
  inputSchema: ZodTypeAny;
  execute: (input: unknown, context: AgentToolContext) => Promise<unknown>;
};

const AGENT_TOOL_PAGE_SIZE = 25;
const ALL_SEARCH_TYPES = agentSearchRecordTypeSchema.options;

const boundedPageSizeSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(AGENT_TOOL_PAGE_SIZE)
  .default(10);

const emptyToolInputSchema = z.object({}).default({});

const idToolInputSchema = z.object({
  id: uuidSchema,
});

const sourceLinksToolInputSchema = z.object({
  source_id: uuidSchema,
});

const entryListToolInputSchema = z.object({
  cursor: z.string().optional(),
  page_size: boundedPageSizeSchema,
  date_from: utcDateTimeSchema.optional(),
  date_to: utcDateTimeSchema.optional(),
  type: entryTypeSchema.optional(),
  flare_only: z.boolean().optional(),
  body_region_id: uuidSchema.optional(),
  symptom_id: uuidSchema.optional(),
  trigger_id: uuidSchema.optional(),
});

const sourceListToolInputSchema = z.object({
  cursor: z.string().optional(),
  page_size: boundedPageSizeSchema,
  source_type: sourceTypeSchema.optional(),
  tag: z.string().max(120).optional(),
  date_from: dateSchema.optional(),
  date_to: dateSchema.optional(),
});

const procedureListToolInputSchema = z.object({
  cursor: z.string().optional(),
  page_size: boundedPageSizeSchema,
  date_from: utcDateTimeSchema.optional(),
  date_to: utcDateTimeSchema.optional(),
  type: procedureEventTypeSchema.optional(),
  source_id: uuidSchema.optional(),
});

const medicationListToolInputSchema = z.object({
  cursor: z.string().optional(),
  page_size: boundedPageSizeSchema,
  status: medicationStatusSchema.optional(),
});

const medicationResponseListToolInputSchema = z.object({
  cursor: z.string().optional(),
  page_size: boundedPageSizeSchema,
  medication_id: uuidSchema.optional(),
  entry_id: uuidSchema.optional(),
  date_from: utcDateTimeSchema.optional(),
  date_to: utcDateTimeSchema.optional(),
});

const decisionListToolInputSchema = z.object({
  cursor: z.string().optional(),
  page_size: boundedPageSizeSchema,
  status: decisionStatusSchema.optional(),
  open_only: z.boolean().optional(),
  target_date_from: dateSchema.optional(),
  target_date_to: dateSchema.optional(),
});

const createDraftToolInputSchema = agentToolDraftCreateInputSchema.omit({
  thread_id: true,
});

const searchTimelineInputSchema = z.object({
  query: z.string().trim().min(1).max(400),
  page_size: boundedPageSizeSchema,
  date_from: utcDateTimeSchema.optional(),
  date_to: utcDateTimeSchema.optional(),
  item_type: timelineItemTypeSchema.optional(),
});

const compactJson = (value: unknown) => JSON.parse(JSON.stringify(value));

function titleFromPayload(payload: Record<string, unknown>) {
  const title = payload.title ?? payload.purpose ?? payload.name;
  return typeof title === "string" && title.trim() ? title.trim() : null;
}

function normalizeQueryTerm(query: string) {
  return query
    .replace(/[%,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function ilikeExpression(columns: string[], query: string) {
  const term = normalizeQueryTerm(query);
  const pattern = `%${term}%`;
  return columns.map((column) => `${column}.ilike.${pattern}`).join(",");
}

async function searchTable(
  supabase: SupabaseClient,
  options: {
    table: string;
    recordType: string;
    columns: string[];
    orderBy: string;
    dateColumn?: string;
    dateFrom?: string;
    dateTo?: string;
    query: string;
    limit: number;
  },
) {
  const term = normalizeQueryTerm(options.query);
  if (!term) {
    return [];
  }

  let query = supabase
    .from(options.table)
    .select("*")
    .is("deleted_at", null)
    .or(ilikeExpression(options.columns, term))
    .order(options.orderBy, { ascending: false })
    .limit(options.limit);

  if (options.dateColumn && options.dateFrom) {
    query = query.gte(options.dateColumn, options.dateFrom);
  }

  if (options.dateColumn && options.dateTo) {
    query = query.lte(options.dateColumn, options.dateTo);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as Row[]).map((row) => ({
    record_type: options.recordType,
    id: row.id,
    title: row.title ?? row.name ?? row.purpose ?? null,
    occurred_at:
      row.occurred_at ??
      row.taken_at ??
      row.source_date ??
      row.target_date ??
      row.created_at ??
      null,
    summary:
      row.summary ??
      row.notes ??
      row.question ??
      row.reason ??
      row.citation ??
      null,
    record: compactJson(row),
  }));
}

function textMatches(value: unknown, query: string) {
  const needle = query.trim().toLowerCase();
  return JSON.stringify(value).toLowerCase().includes(needle);
}

export async function buildCaseSnapshot(
  supabase: SupabaseClient,
): Promise<AgentCaseSnapshot> {
  await requireCurrentProfile(supabase);

  const [
    recentTimeline,
    recentEntries,
    activeMedications,
    openDecisions,
    upcomingAppointments,
    openTasks,
    recentSources,
  ] = await Promise.all([
    listTimelineItems({ page_size: 12 }, supabase),
    listEntries({ page_size: 8 }, supabase),
    listMedications({ page_size: 20, status: "active" }, supabase),
    listDecisions({ page_size: 15, open_only: true }, supabase),
    listAppointments({ page_size: 10, upcoming: true }, supabase),
    listTasks({ page_size: 15, open_only: true }, supabase),
    listSources({ page_size: 10 }, supabase),
  ]);

  return agentCaseSnapshotSchema.parse({
    generated_at: new Date().toISOString(),
    recent_timeline: compactJson(recentTimeline.items),
    recent_entries: compactJson(recentEntries.items),
    active_medications: compactJson(activeMedications.items),
    open_decisions: compactJson(openDecisions.items),
    upcoming_appointments: compactJson(upcomingAppointments.items),
    open_tasks: compactJson(openTasks.items),
    recent_sources: compactJson(recentSources.items),
  });
}

async function ensureAgentImportSession(
  context: AgentToolContext,
): Promise<AiImportSession> {
  const profile = await requireCurrentProfile(context.supabase);
  assertCanWrite(profile);

  const { data: existing, error: existingError } = await context.supabase
    .from("ai_import_sessions")
    .select("*")
    .eq("agent_thread_id", context.thread.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1);

  if (existingError) throw existingError;
  if (existing?.[0]) {
    return normalizeAiImportSessionRow(existing[0] as Row);
  }

  const { data, error } = await context.supabase
    .from("ai_import_sessions")
    .insert({
      family_id: context.thread.family_id,
      user_id: profile.id,
      source_id: context.thread.source_id,
      agent_thread_id: context.thread.id,
      input_label:
        context.thread.title ?? `AI agent thread ${context.thread.id}`,
      raw_text:
        "Draft workspace created by the multi-turn AI agent. Human review and approval are required before any draft becomes a real record.",
      requested_target_types: [],
      status: "ready_for_review",
      prompt_version: context.thread.system_prompt_version,
    })
    .select("*")
    .single();

  if (error) throw error;
  return normalizeAiImportSessionRow(data as Row);
}

async function assertDraftBelongsToThread(
  draftId: string,
  context: AgentToolContext,
) {
  const { data, error } = await context.supabase
    .from("ai_import_drafts")
    .select("id")
    .eq("id", draftId)
    .eq("agent_thread_id", context.thread.id)
    .is("deleted_at", null)
    .single();

  if (error) throw error;
  if (!data)
    throw new NotFoundError("AI import draft not found for this agent thread");
}

async function createDraft(
  input: unknown,
  context: AgentToolContext,
): Promise<AiImportDraft> {
  const parsed = agentToolDraftCreateInputSchema.parse({
    ...(typeof input === "object" && input ? input : {}),
    thread_id: context.thread.id,
  });
  const profile = await requireCurrentProfile(context.supabase);
  assertCanWrite(profile);

  const session = await ensureAgentImportSession(context);
  const validation = validateAiImportDraftPayload(
    parsed.target_type,
    parsed.proposed_payload,
  );
  const payload =
    validation.ok && validation.payload
      ? validation.payload
      : parsed.proposed_payload;

  const { data, error } = await context.supabase
    .from("ai_import_drafts")
    .insert({
      family_id: context.thread.family_id,
      user_id: profile.id,
      session_id: session.id,
      agent_thread_id: context.thread.id,
      target_type: parsed.target_type,
      status: "proposed",
      title: titleFromPayload(payload),
      proposed_payload: payload,
      confidence: parsed.confidence,
      missing_fields: parsed.missing_fields,
      evidence_spans: parsed.evidence_spans,
      warnings: [
        ...parsed.warnings,
        ...(validation.ok ? [] : ["Draft requires edits before commit."]),
      ],
      validation_errors: validation.validation_errors,
    })
    .select("*")
    .single();

  if (error) throw error;
  return normalizeAiImportDraftRow(data as Row);
}

async function updateDraft(input: unknown, context: AgentToolContext) {
  const parsed = agentToolDraftUpdateInputSchema.parse(input);
  await assertDraftBelongsToThread(parsed.id, context);
  return updateAiImportDraft(parsed, context.supabase);
}

async function rejectDraft(input: unknown, context: AgentToolContext) {
  const parsed = agentToolDraftRejectInputSchema.parse(input);
  await assertDraftBelongsToThread(parsed.id, context);
  return rejectAiImportDraft(parsed, context.supabase);
}

async function searchRecords(input: unknown, context: AgentToolContext) {
  await requireCurrentProfile(context.supabase);
  const parsed = agentSearchRecordsInputSchema.parse(input);
  const limit = parsed.page_size;
  const types = parsed.types.length
    ? new Set(parsed.types)
    : new Set(ALL_SEARCH_TYPES);

  const searches: Promise<unknown[]>[] = [];

  if (types.has("timeline")) {
    searches.push(
      listTimelineItems(
        {
          page_size: AGENT_TOOL_PAGE_SIZE,
          date_from: parsed.date_from,
          date_to: parsed.date_to,
        },
        context.supabase,
      ).then((page) =>
        page.items
          .filter((item) => textMatches(item, parsed.query))
          .slice(0, limit)
          .map((item) => ({
            record_type: "timeline",
            id: item.id,
            title: item.title,
            occurred_at: item.occurred_at,
            summary: item.summary,
            record: item,
          })),
      ),
    );
  }

  if (types.has("entries")) {
    searches.push(
      searchTable(context.supabase, {
        table: "entries",
        recordType: "entries",
        columns: ["title", "notes", "response"],
        orderBy: "occurred_at",
        dateColumn: "occurred_at",
        dateFrom: parsed.date_from,
        dateTo: parsed.date_to,
        query: parsed.query,
        limit,
      }),
    );
  }

  if (types.has("sources")) {
    searches.push(
      searchTable(context.supabase, {
        table: "sources",
        recordType: "sources",
        columns: ["title", "provider", "citation", "summary"],
        orderBy: "created_at",
        query: parsed.query,
        limit,
      }),
    );
  }

  if (types.has("procedure_events")) {
    searches.push(
      searchTable(context.supabase, {
        table: "events",
        recordType: "procedure_events",
        columns: [
          "title",
          "summary",
          "provider",
          "location",
          "diagnostic_question",
          "baseline_before",
          "immediate_effect",
          "new_symptoms",
        ],
        orderBy: "occurred_at",
        dateColumn: "occurred_at",
        dateFrom: parsed.date_from,
        dateTo: parsed.date_to,
        query: parsed.query,
        limit,
      }),
    );
  }

  if (types.has("medications")) {
    searches.push(
      searchTable(context.supabase, {
        table: "medications",
        recordType: "medications",
        columns: [
          "name",
          "dose",
          "route",
          "frequency",
          "prescriber",
          "reason",
          "side_effects",
          "notes",
        ],
        orderBy: "updated_at",
        query: parsed.query,
        limit,
      }),
    );
  }

  if (types.has("medication_responses")) {
    searches.push(
      searchTable(context.supabase, {
        table: "medication_responses",
        recordType: "medication_responses",
        columns: [
          "reason",
          "sedation_effect",
          "cognition_effect",
          "gait_effect",
          "side_effects",
          "notes",
        ],
        orderBy: "taken_at",
        dateColumn: "taken_at",
        dateFrom: parsed.date_from,
        dateTo: parsed.date_to,
        query: parsed.query,
        limit,
      }),
    );
  }

  if (types.has("decisions")) {
    searches.push(
      searchTable(context.supabase, {
        table: "decisions",
        recordType: "decisions",
        columns: [
          "title",
          "question",
          "evidence_for",
          "evidence_against",
          "risks",
          "what_would_change",
          "owner",
          "final_decision",
          "rationale",
        ],
        orderBy: "updated_at",
        query: parsed.query,
        limit,
      }),
    );
  }

  const results = (await Promise.all(searches)).flat().slice(0, limit);

  return {
    query: parsed.query,
    page_size: limit,
    results,
  };
}

export const agentTools = [
  {
    name: "get_case_snapshot",
    description:
      "Return a compact case snapshot: recent timeline, recent pain/log entries, active medications, open decisions, upcoming appointments, open tasks, and recent sources.",
    inputSchema: emptyToolInputSchema,
    execute: async (_input, context) => buildCaseSnapshot(context.supabase),
  },
  {
    name: "search_records",
    description:
      "Search family-scoped records across timeline items, entries, sources, procedure/test events, medications, medication responses, and decisions. Results are capped.",
    inputSchema: agentSearchRecordsInputSchema,
    execute: searchRecords,
  },
  {
    name: "search_timeline",
    description:
      "Search the bounded timeline page for matching text. Use this when the user asks what happened around a date or topic.",
    inputSchema: searchTimelineInputSchema,
    execute: async (input, context) => {
      const parsed = searchTimelineInputSchema.parse(input);
      const page = await listTimelineItems(
        {
          page_size: AGENT_TOOL_PAGE_SIZE,
          date_from: parsed.date_from,
          date_to: parsed.date_to,
          item_type: parsed.item_type,
        },
        context.supabase,
      );
      return {
        query: parsed.query,
        page_size: parsed.page_size,
        results: page.items
          .filter((item) => textMatches(item, parsed.query))
          .slice(0, parsed.page_size),
        metadata: page.metadata,
      };
    },
  },
  {
    name: "list_entries",
    description:
      "List bounded pain/log entries, optionally filtered by date, type, flare-only, body region, symptom, or trigger.",
    inputSchema: entryListToolInputSchema,
    execute: (input, context) =>
      listEntries(entryListToolInputSchema.parse(input), context.supabase),
  },
  {
    name: "get_entry",
    description: "Get one pain/log entry by id.",
    inputSchema: idToolInputSchema,
    execute: (input, context) =>
      getEntry(idToolInputSchema.parse(input).id, context.supabase),
  },
  {
    name: "list_sources",
    description: "List bounded source-library records.",
    inputSchema: sourceListToolInputSchema,
    execute: (input, context) =>
      listSources(sourceListToolInputSchema.parse(input), context.supabase),
  },
  {
    name: "get_source",
    description: "Get one source-library record by id.",
    inputSchema: idToolInputSchema,
    execute: (input, context) =>
      getSource(idToolInputSchema.parse(input).id, context.supabase),
  },
  {
    name: "list_source_links",
    description:
      "List procedure/test events, diagnostic evidence links, and decision evidence links connected to a source.",
    inputSchema: sourceLinksToolInputSchema,
    execute: (input, context) =>
      listSourceLinks(
        sourceLinksToolInputSchema.parse(input).source_id,
        context.supabase,
      ),
  },
  {
    name: "list_procedure_events",
    description:
      "List bounded procedure, test, imaging, consult, and lab events.",
    inputSchema: procedureListToolInputSchema,
    execute: (input, context) =>
      listProcedureEvents(
        procedureListToolInputSchema.parse(input),
        context.supabase,
      ),
  },
  {
    name: "get_procedure_event",
    description: "Get one procedure/test event by id.",
    inputSchema: idToolInputSchema,
    execute: (input, context) =>
      getProcedureEvent(idToolInputSchema.parse(input).id, context.supabase),
  },
  {
    name: "list_medications",
    description: "List bounded medication records.",
    inputSchema: medicationListToolInputSchema,
    execute: (input, context) =>
      listMedications(
        medicationListToolInputSchema.parse(input),
        context.supabase,
      ),
  },
  {
    name: "get_medication",
    description: "Get one medication by id.",
    inputSchema: idToolInputSchema,
    execute: (input, context) =>
      getMedication(idToolInputSchema.parse(input).id, context.supabase),
  },
  {
    name: "list_medication_responses",
    description:
      "List bounded medication response records, optionally filtered by medication, entry, or date range.",
    inputSchema: medicationResponseListToolInputSchema,
    execute: (input, context) =>
      listMedicationResponses(
        medicationResponseListToolInputSchema.parse(input),
        context.supabase,
      ),
  },
  {
    name: "get_medication_response",
    description: "Get one medication response by id.",
    inputSchema: idToolInputSchema,
    execute: (input, context) =>
      getMedicationResponse(
        idToolInputSchema.parse(input).id,
        context.supabase,
      ),
  },
  {
    name: "list_decisions",
    description: "List bounded decision tracker records.",
    inputSchema: decisionListToolInputSchema,
    execute: (input, context) =>
      listDecisions(decisionListToolInputSchema.parse(input), context.supabase),
  },
  {
    name: "get_decision",
    description: "Get one decision tracker record by id.",
    inputSchema: idToolInputSchema,
    execute: (input, context) =>
      getDecision(idToolInputSchema.parse(input).id, context.supabase),
  },
  {
    name: "create_draft",
    description:
      "Create a reviewable AI import draft only. This never creates a real medical record; a human must approve the draft separately.",
    inputSchema: createDraftToolInputSchema,
    execute: createDraft,
  },
  {
    name: "update_draft",
    description:
      "Update a reviewable AI import draft owned by the current agent thread. This never commits the draft.",
    inputSchema: agentToolDraftUpdateInputSchema,
    execute: updateDraft,
  },
  {
    name: "reject_draft",
    description:
      "Reject a reviewable AI import draft owned by the current agent thread. This never deletes or commits real records.",
    inputSchema: agentToolDraftRejectInputSchema,
    execute: rejectDraft,
  },
] satisfies AgentTool[];

export function getAgentTool(name: string) {
  const parsed = agentToolNameSchema.safeParse(name);
  if (!parsed.success) {
    return null;
  }

  return agentTools.find((tool) => tool.name === parsed.data) ?? null;
}

export async function executeAgentTool(
  name: string,
  input: unknown,
  context: AgentToolContext,
) {
  const tool = getAgentTool(name);
  if (!tool) {
    throw new Error(`Agent tool is not allowlisted: ${name}`);
  }

  return compactJson(await tool.execute(input, context));
}

export function agentToolNames() {
  return agentTools.map((tool) => tool.name);
}

export const agentToolMetadata = agentTools.map((tool) => ({
  name: tool.name,
  description: tool.description,
  inputSchema: tool.inputSchema,
}));
