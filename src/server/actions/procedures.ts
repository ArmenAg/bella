"use server";

import {
  createProcedureEvent as createProcedureEventService,
  getProcedureEvent as getProcedureEventService,
  listProcedureEvents as listProcedureEventsService,
  softDeleteProcedureEvent as softDeleteProcedureEventService,
  updateProcedureEvent as updateProcedureEventService,
} from "@/server/services/procedures";
import { createSupabaseServerClient } from "@/server/supabase/client";
import type {
  CreateProcedureEventInput,
  ProcedureEvent,
  ProcedureEventFilter,
  UpdateProcedureEventInput,
} from "@/server/contracts";
import { toActionResult, type ActionResult } from "./result";

export async function createProcedureEvent(
  input: CreateProcedureEventInput,
): Promise<ActionResult<ProcedureEvent>> {
  return toActionResult(async () =>
    createProcedureEventService(input, await createSupabaseServerClient()),
  );
}

export async function updateProcedureEvent(
  input: UpdateProcedureEventInput,
): Promise<ActionResult<ProcedureEvent>> {
  return toActionResult(async () =>
    updateProcedureEventService(input, await createSupabaseServerClient()),
  );
}

export async function softDeleteProcedureEvent(
  id: string,
  reason: string,
): Promise<ActionResult<ProcedureEvent>> {
  return toActionResult(async () =>
    softDeleteProcedureEventService(
      id,
      reason,
      await createSupabaseServerClient(),
    ),
  );
}

export async function getProcedureEvent(
  id: string,
): Promise<ActionResult<ProcedureEvent>> {
  return toActionResult(async () =>
    getProcedureEventService(id, await createSupabaseServerClient()),
  );
}

export async function listProcedureEvents(input: ProcedureEventFilter) {
  return toActionResult(async () =>
    listProcedureEventsService(input, await createSupabaseServerClient()),
  );
}
