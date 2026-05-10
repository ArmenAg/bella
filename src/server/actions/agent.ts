"use server";

import {
  createAgentThread as createAgentThreadService,
  getAgentThread as getAgentThreadService,
  listAgentMessages as listAgentMessagesService,
  listAgentThreads as listAgentThreadsService,
  listAgentToolCalls as listAgentToolCallsService,
  sendAgentMessage as sendAgentMessageService,
  updateAgentThread as updateAgentThreadService,
} from "@/server/services/agent";
import { createSupabaseServerClient } from "@/server/supabase/client";
import type {
  AgentMessage,
  AgentMessageFilter,
  AgentThread,
  AgentThreadFilter,
  AgentToolCall,
  AgentToolCallFilter,
  AgentTurnResult,
  CreateAgentThreadInput,
  SendAgentMessageInput,
  UpdateAgentThreadInput,
} from "@/server/contracts";
import { toActionResult, type ActionResult } from "./result";

export async function createAgentThread(
  input: CreateAgentThreadInput,
): Promise<ActionResult<AgentThread>> {
  return toActionResult(async () =>
    createAgentThreadService(input, await createSupabaseServerClient()),
  );
}

export async function updateAgentThread(
  input: UpdateAgentThreadInput,
): Promise<ActionResult<AgentThread>> {
  return toActionResult(async () =>
    updateAgentThreadService(input, await createSupabaseServerClient()),
  );
}

export async function getAgentThread(
  id: string,
): Promise<ActionResult<AgentThread>> {
  return toActionResult(async () =>
    getAgentThreadService(id, await createSupabaseServerClient()),
  );
}

export async function listAgentThreads(input: AgentThreadFilter) {
  return toActionResult(async () =>
    listAgentThreadsService(input, await createSupabaseServerClient()),
  );
}

export async function listAgentMessages(input: AgentMessageFilter) {
  return toActionResult(async () =>
    listAgentMessagesService(input, await createSupabaseServerClient()),
  );
}

export async function listAgentToolCalls(input: AgentToolCallFilter) {
  return toActionResult(async () =>
    listAgentToolCallsService(input, await createSupabaseServerClient()),
  );
}

export async function sendAgentMessage(
  input: SendAgentMessageInput,
): Promise<ActionResult<AgentTurnResult>> {
  return toActionResult(async () =>
    sendAgentMessageService(input, await createSupabaseServerClient()),
  );
}

export type { AgentMessage, AgentThread, AgentToolCall };
