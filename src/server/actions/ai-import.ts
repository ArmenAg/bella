"use server";

import {
  analyzeAiImportSession as analyzeAiImportSessionService,
  analyzeAiImportText as analyzeAiImportTextService,
  commitAiImportDraft as commitAiImportDraftService,
  createAiImportSession as createAiImportSessionService,
  getAiImportDraft as getAiImportDraftService,
  getAiImportSession as getAiImportSessionService,
  listAiImportDrafts as listAiImportDraftsService,
  listAiImportSessions as listAiImportSessionsService,
  rejectAiImportDraft as rejectAiImportDraftService,
  updateAiImportDraft as updateAiImportDraftService,
} from "@/server/services/ai-import";
import { createSupabaseServerClient } from "@/server/supabase/client";
import type {
  AiImportCommitResult,
  AiImportDraft,
  AiImportDraftFilter,
  AiImportSession,
  AiImportSessionFilter,
  AiImportSessionWithDrafts,
  AnalyzeAiImportSessionInput,
  AnalyzeAiImportTextInput,
  CommitAiImportDraftInput,
  CreateAiImportSessionInput,
  RejectAiImportDraftInput,
  UpdateAiImportDraftInput,
} from "@/server/contracts";
import { toActionResult, type ActionResult } from "./result";

export async function createAiImportSession(
  input: CreateAiImportSessionInput,
): Promise<ActionResult<AiImportSession>> {
  return toActionResult(async () =>
    createAiImportSessionService(input, await createSupabaseServerClient()),
  );
}

export async function analyzeAiImportSession(
  input: AnalyzeAiImportSessionInput,
): Promise<ActionResult<AiImportSessionWithDrafts>> {
  return toActionResult(async () =>
    analyzeAiImportSessionService(input, await createSupabaseServerClient()),
  );
}

export async function analyzeAiImportText(
  input: AnalyzeAiImportTextInput,
): Promise<ActionResult<AiImportSessionWithDrafts>> {
  return toActionResult(async () =>
    analyzeAiImportTextService(input, await createSupabaseServerClient()),
  );
}

export async function updateAiImportDraft(
  input: UpdateAiImportDraftInput,
): Promise<ActionResult<AiImportDraft>> {
  return toActionResult(async () =>
    updateAiImportDraftService(input, await createSupabaseServerClient()),
  );
}

export async function rejectAiImportDraft(
  input: RejectAiImportDraftInput,
): Promise<ActionResult<AiImportDraft>> {
  return toActionResult(async () =>
    rejectAiImportDraftService(input, await createSupabaseServerClient()),
  );
}

export async function commitAiImportDraft(
  input: CommitAiImportDraftInput,
): Promise<ActionResult<AiImportCommitResult>> {
  return toActionResult(async () =>
    commitAiImportDraftService(input, await createSupabaseServerClient()),
  );
}

export async function getAiImportSession(
  id: string,
): Promise<ActionResult<AiImportSession>> {
  return toActionResult(async () =>
    getAiImportSessionService(id, await createSupabaseServerClient()),
  );
}

export async function getAiImportDraft(
  id: string,
): Promise<ActionResult<AiImportDraft>> {
  return toActionResult(async () =>
    getAiImportDraftService(id, await createSupabaseServerClient()),
  );
}

export async function listAiImportSessions(input: AiImportSessionFilter) {
  return toActionResult(async () =>
    listAiImportSessionsService(input, await createSupabaseServerClient()),
  );
}

export async function listAiImportDrafts(input: AiImportDraftFilter) {
  return toActionResult(async () =>
    listAiImportDraftsService(input, await createSupabaseServerClient()),
  );
}
