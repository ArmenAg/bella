import type { SupabaseClient } from "@supabase/supabase-js";
import {
  agentContextSnapshotSchema,
  agentMessageFilterSchema,
  agentMessageSchema,
  agentThreadFilterSchema,
  agentThreadSchema,
  agentToolCallFilterSchema,
  agentToolCallSchema,
  agentTurnResultSchema,
  createAgentThreadInputSchema,
  updateAgentThreadInputSchema,
  sendAgentMessageInputSchema,
  type AgentContextSnapshot,
  type AgentMessage,
  type AgentMessageFilter,
  type AgentThread,
  type AgentThreadFilter,
  type AgentToolCall,
  type AgentToolCallFilter,
  type AgentTurnResult,
  type CreateAgentThreadInput,
  type SendAgentMessageInput,
  type UpdateAgentThreadInput,
  type AiImportDraft,
} from "@/server/contracts";
import { DEFAULT_PAGE_SIZE } from "@/server/contracts/common";
import {
  AGENT_SYSTEM_PROMPT_VERSION,
  resolveAgentModel,
  runAgentTurnWithResponsesApi,
  type AgentRunnerInput,
} from "./agent-runner";
import { buildCaseSnapshot } from "./agent-tools";
import { normalizeAiImportDraftRow } from "./ai-import";
import { assertCanWrite, requireCurrentProfile } from "./auth";

type Row = Record<string, unknown>;

type PaginatedAgentThreads = {
  items: AgentThread[];
  next_cursor: string | null;
  page_size: number;
};

type PaginatedAgentMessages = {
  items: AgentMessage[];
  next_cursor: string | null;
  page_size: number;
};

type PaginatedAgentToolCalls = {
  items: AgentToolCall[];
  next_cursor: string | null;
  page_size: number;
};

export type AgentTurnRunner = (input: AgentRunnerInput) => Promise<{
  content: string;
  response_id: string | null;
  token_input: number | null;
  token_output: number | null;
  tool_calls: Array<{
    name: string;
    call_id: string | null;
    input: unknown;
    output: unknown | null;
    status: "succeeded" | "failed";
    error_message: string | null;
  }>;
}>;

export function normalizeAgentThreadRow(row: Row): AgentThread {
  return agentThreadSchema.parse({
    ...row,
    source_id: row.source_id ?? null,
    title: row.title ?? null,
    model: row.model ?? null,
    last_message_at: row.last_message_at ?? null,
    metadata:
      row.metadata && typeof row.metadata === "object" ? row.metadata : {},
    error_message: row.error_message ?? null,
    deleted_at: row.deleted_at ?? null,
  });
}

export function normalizeAgentMessageRow(row: Row): AgentMessage {
  return agentMessageSchema.parse({
    ...row,
    user_id: row.user_id ?? null,
    content: row.content ?? "",
    content_json:
      row.content_json && typeof row.content_json === "object"
        ? row.content_json
        : {},
    model: row.model ?? null,
    response_id: row.response_id ?? null,
    token_input: row.token_input ?? null,
    token_output: row.token_output ?? null,
    parent_message_id: row.parent_message_id ?? null,
    deleted_at: row.deleted_at ?? null,
  });
}

export function normalizeAgentToolCallRow(row: Row): AgentToolCall {
  return agentToolCallSchema.parse({
    ...row,
    user_id: row.user_id ?? null,
    message_id: row.message_id ?? null,
    tool_call_id: row.tool_call_id ?? null,
    input: row.input && typeof row.input === "object" ? row.input : {},
    output: row.output ?? null,
    error_message: row.error_message ?? null,
    started_at: row.started_at ?? null,
    completed_at: row.completed_at ?? null,
    deleted_at: row.deleted_at ?? null,
  });
}

export function normalizeAgentContextSnapshotRow(
  row: Row,
): AgentContextSnapshot {
  return agentContextSnapshotSchema.parse({
    ...row,
    user_id: row.user_id ?? null,
    message_id: row.message_id ?? null,
    context: row.context && typeof row.context === "object" ? row.context : {},
    source_refs: Array.isArray(row.source_refs) ? row.source_refs : [],
    summary: row.summary ?? null,
    deleted_at: row.deleted_at ?? null,
  });
}

function pageSizeFromInput(input: { page_size?: number }) {
  return input.page_size ?? DEFAULT_PAGE_SIZE;
}

export async function createAgentThread(
  input: CreateAgentThreadInput,
  supabase: SupabaseClient,
): Promise<AgentThread> {
  const parsed = createAgentThreadInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("ai_agent_threads")
    .insert({
      family_id: profile.family_id,
      user_id: profile.id,
      source_id: parsed.source_id,
      title: parsed.title,
      mode: parsed.mode,
      status: "active",
      system_prompt_version: AGENT_SYSTEM_PROMPT_VERSION,
      metadata: {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return normalizeAgentThreadRow(data as Row);
}

export async function getAgentThread(
  id: string,
  supabase: SupabaseClient,
): Promise<AgentThread> {
  await requireCurrentProfile(supabase);

  const { data, error } = await supabase
    .from("ai_agent_threads")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) throw error;
  if (!data) throw new Error("AI agent thread not found");
  return normalizeAgentThreadRow(data as Row);
}

export async function listAgentThreads(
  input: AgentThreadFilter,
  supabase: SupabaseClient,
): Promise<PaginatedAgentThreads> {
  const parsed = agentThreadFilterSchema.parse(input);
  const pageSize = pageSizeFromInput(parsed);
  await requireCurrentProfile(supabase);

  let query = supabase
    .from("ai_agent_threads")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);

  if (parsed.cursor) query = query.lt("updated_at", parsed.cursor);
  if (parsed.status) query = query.eq("status", parsed.status);

  const { data, error } = await query;
  if (error) throw error;

  const rows = ((data ?? []) as Row[]).map(normalizeAgentThreadRow);
  const items = rows.slice(0, pageSize);
  const overflow = rows[pageSize];

  return {
    items,
    next_cursor: overflow ? overflow.updated_at : null,
    page_size: pageSize,
  };
}

export async function updateAgentThread(
  input: UpdateAgentThreadInput,
  supabase: SupabaseClient,
): Promise<AgentThread> {
  const parsed = updateAgentThreadInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);
  const { id, ...patch } = parsed;

  const { data, error } = await supabase
    .from("ai_agent_threads")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeAgentThreadRow(data as Row);
}

export async function listAgentMessages(
  input: AgentMessageFilter,
  supabase: SupabaseClient,
): Promise<PaginatedAgentMessages> {
  const parsed = agentMessageFilterSchema.parse(input);
  const pageSize = pageSizeFromInput(parsed);
  await requireCurrentProfile(supabase);

  let query = supabase
    .from("ai_agent_messages")
    .select("*")
    .eq("thread_id", parsed.thread_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(pageSize + 1);

  if (parsed.cursor) query = query.gt("created_at", parsed.cursor);

  const { data, error } = await query;
  if (error) throw error;

  const rows = ((data ?? []) as Row[]).map(normalizeAgentMessageRow);
  const items = rows.slice(0, pageSize);
  const overflow = rows[pageSize];

  return {
    items,
    next_cursor: overflow ? overflow.created_at : null,
    page_size: pageSize,
  };
}

async function listThreadMessagesForRunner(
  threadId: string,
  supabase: SupabaseClient,
) {
  const { data, error } = await supabase
    .from("ai_agent_messages")
    .select("*")
    .eq("thread_id", threadId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(60);

  if (error) throw error;
  return ((data ?? []) as Row[]).map(normalizeAgentMessageRow);
}

export async function listAgentToolCalls(
  input: AgentToolCallFilter,
  supabase: SupabaseClient,
): Promise<PaginatedAgentToolCalls> {
  const parsed = agentToolCallFilterSchema.parse(input);
  const pageSize = pageSizeFromInput(parsed);
  await requireCurrentProfile(supabase);

  let query = supabase
    .from("ai_agent_tool_calls")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);

  if (parsed.cursor) query = query.lt("created_at", parsed.cursor);
  if (parsed.thread_id) query = query.eq("thread_id", parsed.thread_id);
  if (parsed.message_id) query = query.eq("message_id", parsed.message_id);
  if (parsed.status) query = query.eq("status", parsed.status);

  const { data, error } = await query;
  if (error) throw error;

  const rows = ((data ?? []) as Row[]).map(normalizeAgentToolCallRow);
  const items = rows.slice(0, pageSize);
  const overflow = rows[pageSize];

  return {
    items,
    next_cursor: overflow ? overflow.created_at : null,
    page_size: pageSize,
  };
}

async function listDraftsForThread(
  threadId: string,
  supabase: SupabaseClient,
): Promise<AiImportDraft[]> {
  const { data, error } = await supabase
    .from("ai_import_drafts")
    .select("*")
    .eq("agent_thread_id", threadId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as Row[]).map(normalizeAiImportDraftRow);
}

async function insertAgentMessage(
  supabase: SupabaseClient,
  row: {
    family_id: string;
    user_id: string | null;
    thread_id: string;
    role: "user" | "assistant";
    content: string;
    content_json?: Record<string, unknown>;
    status?: "complete" | "failed";
    model?: string | null;
    response_id?: string | null;
    token_input?: number | null;
    token_output?: number | null;
    parent_message_id?: string | null;
  },
) {
  const { data, error } = await supabase
    .from("ai_agent_messages")
    .insert({
      family_id: row.family_id,
      user_id: row.user_id,
      thread_id: row.thread_id,
      role: row.role,
      content: row.content,
      content_json: row.content_json ?? {},
      status: row.status ?? "complete",
      model: row.model,
      response_id: row.response_id,
      token_input: row.token_input,
      token_output: row.token_output,
      parent_message_id: row.parent_message_id,
    })
    .select("*")
    .single();

  if (error) throw error;
  return normalizeAgentMessageRow(data as Row);
}

async function insertContextSnapshot(
  supabase: SupabaseClient,
  row: {
    family_id: string;
    user_id: string;
    thread_id: string;
    message_id: string;
    context: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase
    .from("ai_agent_context_snapshots")
    .insert({
      family_id: row.family_id,
      user_id: row.user_id,
      thread_id: row.thread_id,
      message_id: row.message_id,
      snapshot_type: "summary",
      context: row.context,
      source_refs: row.context.recent_sources ?? [],
      summary: "Case snapshot captured before an AI agent turn.",
    })
    .select("*")
    .single();

  if (error) throw error;
  return normalizeAgentContextSnapshotRow(data as Row);
}

async function listToolCallsByIds(
  ids: string[],
  supabase: SupabaseClient,
): Promise<AgentToolCall[]> {
  if (ids.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("ai_agent_tool_calls")
    .select("*")
    .in("id", ids)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as Row[]).map(normalizeAgentToolCallRow);
}

export async function sendAgentMessage(
  input: SendAgentMessageInput,
  supabase: SupabaseClient,
  runner: AgentTurnRunner = runAgentTurnWithResponsesApi,
): Promise<AgentTurnResult> {
  const parsed = sendAgentMessageInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);
  const thread = await getAgentThread(parsed.thread_id, supabase);
  const model = resolveAgentModel(parsed.model ?? thread.model ?? undefined);
  const now = new Date().toISOString();
  const toolCallIds: string[] = [];

  const userMessage = await insertAgentMessage(supabase, {
    family_id: thread.family_id,
    user_id: profile.id,
    thread_id: thread.id,
    role: "user",
    content: parsed.message,
  });

  const { error: threadPrepareError } = await supabase
    .from("ai_agent_threads")
    .update({
      model,
      last_message_at: now,
      title: thread.title ?? parsed.message.slice(0, 120),
      status: "active",
      error_message: null,
    })
    .eq("id", thread.id);

  if (threadPrepareError) throw threadPrepareError;

  const caseSnapshot = await buildCaseSnapshot(supabase);
  await insertContextSnapshot(supabase, {
    family_id: thread.family_id,
    user_id: profile.id,
    thread_id: thread.id,
    message_id: userMessage.id,
    context: caseSnapshot,
  });

  const messages = await listThreadMessagesForRunner(thread.id, supabase);

  try {
    const result = await runner({
      thread: {
        ...thread,
        model,
        last_message_at: now,
        title: thread.title ?? parsed.message.slice(0, 120),
      },
      messages,
      caseSnapshot,
      model,
      supabase,
      hooks: {
        onToolCallStart: async (event) => {
          const { data, error } = await supabase
            .from("ai_agent_tool_calls")
            .insert({
              family_id: thread.family_id,
              user_id: profile.id,
              thread_id: thread.id,
              tool_name: event.tool_name,
              tool_call_id: event.tool_call_id,
              status: "running",
              input: event.input ?? {},
              started_at: new Date().toISOString(),
            })
            .select("*")
            .single();

          if (error) throw error;
          const row = normalizeAgentToolCallRow(data as Row);
          toolCallIds.push(row.id);
          return { id: row.id };
        },
        onToolCallEnd: async (started, event) => {
          if (!started) return;

          const { error } = await supabase
            .from("ai_agent_tool_calls")
            .update({
              status: event.status,
              output: event.output,
              error_message: event.error_message,
              completed_at: new Date().toISOString(),
            })
            .eq("id", started.id);

          if (error) throw error;
        },
      },
    });

    const assistantMessage = await insertAgentMessage(supabase, {
      family_id: thread.family_id,
      user_id: null,
      thread_id: thread.id,
      role: "assistant",
      content: result.content,
      content_json: {
        tool_calls: result.tool_calls.map((call) => ({
          name: call.name,
          call_id: call.call_id,
          status: call.status,
          error_message: call.error_message,
        })),
      },
      model,
      response_id: result.response_id,
      token_input: result.token_input,
      token_output: result.token_output,
      parent_message_id: userMessage.id,
    });

    if (toolCallIds.length > 0) {
      const { error } = await supabase
        .from("ai_agent_tool_calls")
        .update({ message_id: assistantMessage.id })
        .in("id", toolCallIds);

      if (error) throw error;
    }

    const { data: updatedThreadRow, error: threadUpdateError } = await supabase
      .from("ai_agent_threads")
      .update({
        last_message_at: new Date().toISOString(),
        status: "active",
        error_message: null,
      })
      .eq("id", thread.id)
      .select("*")
      .single();

    if (threadUpdateError) throw threadUpdateError;

    return agentTurnResultSchema.parse({
      thread: normalizeAgentThreadRow(updatedThreadRow as Row),
      user_message: userMessage,
      assistant_message: assistantMessage,
      tool_calls: await listToolCallsByIds(toolCallIds, supabase),
      drafts: await listDraftsForThread(thread.id, supabase),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI agent turn failed";

    await Promise.all([
      insertAgentMessage(supabase, {
        family_id: thread.family_id,
        user_id: null,
        thread_id: thread.id,
        role: "assistant",
        content: message,
        content_json: { error: message },
        status: "failed",
        model,
        parent_message_id: userMessage.id,
      }).catch(() => null),
      supabase
        .from("ai_agent_threads")
        .update({ status: "failed", error_message: message })
        .eq("id", thread.id),
    ]);

    throw error;
  }
}
