import { z } from "zod";
import { paginationInputSchema, utcDateTimeSchema, uuidSchema } from "./common";
import {
  aiImportConfidenceSchema,
  aiImportDraftSchema,
  aiImportEvidenceSpanSchema,
  aiImportTargetTypeSchema,
  aiImportValidationIssueSchema,
} from "./ai-import";

export const agentThreadModeSchema = z.enum(["agent", "copilot", "review"]);
export const agentThreadStatusSchema = z.enum(["active", "archived", "failed"]);
export const agentMessageRoleSchema = z.enum([
  "system",
  "user",
  "assistant",
  "tool",
]);
export const agentMessageStatusSchema = z.enum([
  "pending",
  "streaming",
  "complete",
  "failed",
]);
export const agentToolCallStatusSchema = z.enum([
  "pending",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);
export const agentContextSnapshotTypeSchema = z.enum([
  "retrieval",
  "pre_tool",
  "post_tool",
  "handoff",
  "summary",
]);

export const agentToolNameSchema = z.enum([
  "get_case_snapshot",
  "search_records",
  "search_timeline",
  "list_entries",
  "get_entry",
  "list_sources",
  "get_source",
  "list_source_links",
  "list_procedure_events",
  "get_procedure_event",
  "list_medications",
  "get_medication",
  "list_medication_responses",
  "get_medication_response",
  "list_decisions",
  "get_decision",
  "create_draft",
  "update_draft",
  "reject_draft",
]);

export const createAgentThreadInputSchema = z.object({
  title: z.string().trim().min(1).max(240).optional(),
  source_id: uuidSchema.optional(),
  mode: agentThreadModeSchema.default("agent"),
});

export const updateAgentThreadInputSchema = z.object({
  id: uuidSchema,
  title: z.string().trim().min(1).max(240).optional(),
  status: agentThreadStatusSchema.optional(),
});

export const sendAgentMessageInputSchema = z.object({
  thread_id: uuidSchema,
  message: z.string().trim().min(1).max(20000),
  model: z.string().trim().min(1).max(120).optional(),
});

export const agentThreadFilterSchema = paginationInputSchema.extend({
  status: agentThreadStatusSchema.optional(),
});

export const agentMessageFilterSchema = paginationInputSchema.extend({
  thread_id: uuidSchema,
});

export const agentToolCallFilterSchema = paginationInputSchema.extend({
  thread_id: uuidSchema.optional(),
  message_id: uuidSchema.optional(),
  status: agentToolCallStatusSchema.optional(),
});

export const agentThreadSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  user_id: uuidSchema,
  source_id: uuidSchema.nullable(),
  title: z.string().nullable(),
  mode: agentThreadModeSchema,
  status: agentThreadStatusSchema,
  model: z.string().nullable(),
  system_prompt_version: z.string(),
  last_message_at: utcDateTimeSchema.nullable(),
  metadata: z.record(z.unknown()),
  error_message: z.string().nullable(),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export const agentMessageSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  user_id: uuidSchema.nullable(),
  thread_id: uuidSchema,
  role: agentMessageRoleSchema,
  content: z.string(),
  content_json: z.record(z.unknown()),
  status: agentMessageStatusSchema,
  model: z.string().nullable(),
  response_id: z.string().nullable(),
  token_input: z.number().int().min(0).nullable(),
  token_output: z.number().int().min(0).nullable(),
  parent_message_id: uuidSchema.nullable(),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export const agentToolCallSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  user_id: uuidSchema.nullable(),
  thread_id: uuidSchema,
  message_id: uuidSchema.nullable(),
  tool_name: agentToolNameSchema.or(z.string()),
  tool_call_id: z.string().nullable(),
  status: agentToolCallStatusSchema,
  input: z.record(z.unknown()),
  output: z.unknown().nullable(),
  error_message: z.string().nullable(),
  started_at: utcDateTimeSchema.nullable(),
  completed_at: utcDateTimeSchema.nullable(),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export const agentContextSnapshotSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  user_id: uuidSchema.nullable(),
  thread_id: uuidSchema,
  message_id: uuidSchema.nullable(),
  snapshot_type: agentContextSnapshotTypeSchema,
  context: z.record(z.unknown()),
  source_refs: z.array(z.unknown()),
  summary: z.string().nullable(),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export const agentToolDraftCreateInputSchema = z.object({
  thread_id: uuidSchema,
  target_type: aiImportTargetTypeSchema,
  proposed_payload: z.record(z.string(), z.unknown()),
  confidence: aiImportConfidenceSchema.default("low"),
  missing_fields: z.array(z.string().min(1).max(240)).default([]),
  evidence_spans: z.array(aiImportEvidenceSpanSchema).default([]),
  warnings: z.array(z.string().min(1).max(1000)).default([]),
});

export const agentToolDraftUpdateInputSchema = z.object({
  id: uuidSchema,
  target_type: aiImportTargetTypeSchema.optional(),
  proposed_payload: z.record(z.string(), z.unknown()).optional(),
  confidence: aiImportConfidenceSchema.optional(),
  missing_fields: z.array(z.string().min(1).max(240)).optional(),
  evidence_spans: z.array(aiImportEvidenceSpanSchema).optional(),
  warnings: z.array(z.string().min(1).max(1000)).optional(),
});

export const agentToolDraftRejectInputSchema = z.object({
  id: uuidSchema,
  reason: z.string().trim().min(1).max(2000),
});

export const agentSearchRecordTypeSchema = z.enum([
  "timeline",
  "entries",
  "sources",
  "procedure_events",
  "medications",
  "medication_responses",
  "decisions",
]);

export const agentSearchRecordsInputSchema = z.object({
  query: z.string().trim().min(1).max(400),
  types: z.array(agentSearchRecordTypeSchema).default([]),
  date_from: utcDateTimeSchema.optional(),
  date_to: utcDateTimeSchema.optional(),
  page_size: z.number().int().min(1).max(25).default(10),
});

export const agentCaseSnapshotSchema = z.object({
  generated_at: utcDateTimeSchema,
  recent_timeline: z.array(z.unknown()),
  recent_entries: z.array(z.unknown()),
  active_medications: z.array(z.unknown()),
  open_decisions: z.array(z.unknown()),
  upcoming_appointments: z.array(z.unknown()),
  open_tasks: z.array(z.unknown()),
  recent_sources: z.array(z.unknown()),
});

export const agentTurnResultSchema = z.object({
  thread: agentThreadSchema,
  user_message: agentMessageSchema,
  assistant_message: agentMessageSchema,
  tool_calls: z.array(agentToolCallSchema),
  drafts: z.array(aiImportDraftSchema),
});

export const paginatedAgentThreadsSchema = z.object({
  items: z.array(agentThreadSchema),
  next_cursor: z.string().nullable(),
  page_size: z.number().int().min(1),
});

export const paginatedAgentMessagesSchema = z.object({
  items: z.array(agentMessageSchema),
  next_cursor: z.string().nullable(),
  page_size: z.number().int().min(1),
});

export const paginatedAgentToolCallsSchema = z.object({
  items: z.array(agentToolCallSchema),
  next_cursor: z.string().nullable(),
  page_size: z.number().int().min(1),
});

export type AgentThreadMode = z.infer<typeof agentThreadModeSchema>;
export type AgentThreadStatus = z.infer<typeof agentThreadStatusSchema>;
export type AgentMessageRole = z.infer<typeof agentMessageRoleSchema>;
export type AgentToolCallStatus = z.infer<typeof agentToolCallStatusSchema>;
export type AgentToolName = z.infer<typeof agentToolNameSchema>;
export type AgentThread = z.infer<typeof agentThreadSchema>;
export type AgentMessage = z.infer<typeof agentMessageSchema>;
export type AgentToolCall = z.infer<typeof agentToolCallSchema>;
export type AgentContextSnapshot = z.infer<typeof agentContextSnapshotSchema>;
export type AgentCaseSnapshot = z.infer<typeof agentCaseSnapshotSchema>;
export type AgentTurnResult = z.infer<typeof agentTurnResultSchema>;
export type CreateAgentThreadInput = z.input<
  typeof createAgentThreadInputSchema
>;
export type UpdateAgentThreadInput = z.input<
  typeof updateAgentThreadInputSchema
>;
export type SendAgentMessageInput = z.input<typeof sendAgentMessageInputSchema>;
export type AgentThreadFilter = z.input<typeof agentThreadFilterSchema>;
export type AgentMessageFilter = z.input<typeof agentMessageFilterSchema>;
export type AgentToolCallFilter = z.input<typeof agentToolCallFilterSchema>;
export type AgentToolDraftCreateInput = z.input<
  typeof agentToolDraftCreateInputSchema
>;
export type AgentToolDraftUpdateInput = z.input<
  typeof agentToolDraftUpdateInputSchema
>;
export type AgentToolDraftRejectInput = z.input<
  typeof agentToolDraftRejectInputSchema
>;
export type AgentSearchRecordsInput = z.input<
  typeof agentSearchRecordsInputSchema
>;
export type AgentSearchRecordType = z.infer<typeof agentSearchRecordTypeSchema>;
export type AiImportDraftValidationIssue = z.infer<
  typeof aiImportValidationIssueSchema
>;
