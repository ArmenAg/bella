"use server";

import {
  createDecision as createDecisionService,
  getDecision as getDecisionService,
  linkDecisionEvidence as linkDecisionEvidenceService,
  listDecisions as listDecisionsService,
  softDeleteDecision as softDeleteDecisionService,
  updateDecision as updateDecisionService,
} from "@/server/services/decisions";
import { createSupabaseServerClient } from "@/server/supabase/client";
import type {
  CreateDecisionInput,
  Decision,
  DecisionEvidenceLink,
  DecisionFilter,
  LinkDecisionEvidenceInput,
  UpdateDecisionInput,
} from "@/server/contracts";
import { toActionResult, type ActionResult } from "./result";

export async function createDecision(
  input: CreateDecisionInput,
): Promise<ActionResult<Decision>> {
  return toActionResult(async () =>
    createDecisionService(input, await createSupabaseServerClient()),
  );
}

export async function updateDecision(
  input: UpdateDecisionInput,
): Promise<ActionResult<Decision>> {
  return toActionResult(async () =>
    updateDecisionService(input, await createSupabaseServerClient()),
  );
}

export async function softDeleteDecision(
  id: string,
  reason: string,
): Promise<ActionResult<Decision>> {
  return toActionResult(async () =>
    softDeleteDecisionService(id, reason, await createSupabaseServerClient()),
  );
}

export async function getDecision(id: string): Promise<ActionResult<Decision>> {
  return toActionResult(async () =>
    getDecisionService(id, await createSupabaseServerClient()),
  );
}

export async function listDecisions(input: DecisionFilter) {
  return toActionResult(async () =>
    listDecisionsService(input, await createSupabaseServerClient()),
  );
}

export async function linkDecisionEvidence(
  input: LinkDecisionEvidenceInput,
): Promise<ActionResult<DecisionEvidenceLink>> {
  return toActionResult(async () =>
    linkDecisionEvidenceService(input, await createSupabaseServerClient()),
  );
}
