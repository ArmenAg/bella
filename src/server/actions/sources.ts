"use server";

import {
  attachFileToSource as attachFileToSourceService,
  createSource as createSourceService,
  getSource as getSourceService,
  linkSourceToDecision as linkSourceToDecisionService,
  linkSourceToDiagnosis as linkSourceToDiagnosisService,
  linkSourceToEvent as linkSourceToEventService,
  listSourceLinks as listSourceLinksService,
  listSources as listSourcesService,
  softDeleteSource as softDeleteSourceService,
  updateSource as updateSourceService,
} from "@/server/services/sources";
import { createSupabaseServerClient } from "@/server/supabase/client";
import type {
  AttachFileToSourceInput,
  AttachmentLinkDTO,
  CreateSourceInput,
  DecisionEvidenceLink,
  EvidenceLink,
  LinkSourceToDecisionInput,
  LinkSourceToDiagnosisInput,
  LinkSourceToEventInput,
  ProcedureEvent,
  Source,
  SourceFilter,
  SourceLinks,
  UpdateSourceInput,
} from "@/server/contracts";
import { toActionResult, type ActionResult } from "./result";

export async function createSource(
  input: CreateSourceInput,
): Promise<ActionResult<Source>> {
  return toActionResult(async () =>
    createSourceService(input, await createSupabaseServerClient()),
  );
}

export async function updateSource(
  input: UpdateSourceInput,
): Promise<ActionResult<Source>> {
  return toActionResult(async () =>
    updateSourceService(input, await createSupabaseServerClient()),
  );
}

export async function softDeleteSource(
  id: string,
  reason: string,
): Promise<ActionResult<Source>> {
  return toActionResult(async () =>
    softDeleteSourceService(id, reason, await createSupabaseServerClient()),
  );
}

export async function getSource(id: string): Promise<ActionResult<Source>> {
  return toActionResult(async () =>
    getSourceService(id, await createSupabaseServerClient()),
  );
}

export async function listSources(input: SourceFilter) {
  return toActionResult(async () =>
    listSourcesService(input, await createSupabaseServerClient()),
  );
}

export async function listSourceLinks(
  sourceId: string,
): Promise<ActionResult<SourceLinks>> {
  return toActionResult(async () =>
    listSourceLinksService(sourceId, await createSupabaseServerClient()),
  );
}

export async function linkSourceToEvent(
  input: LinkSourceToEventInput,
): Promise<ActionResult<ProcedureEvent>> {
  return toActionResult(async () =>
    linkSourceToEventService(input, await createSupabaseServerClient()),
  );
}

export async function linkSourceToDiagnosis(
  input: LinkSourceToDiagnosisInput,
): Promise<ActionResult<EvidenceLink>> {
  return toActionResult(async () =>
    linkSourceToDiagnosisService(input, await createSupabaseServerClient()),
  );
}

export async function linkSourceToDecision(
  input: LinkSourceToDecisionInput,
): Promise<ActionResult<DecisionEvidenceLink>> {
  return toActionResult(async () =>
    linkSourceToDecisionService(input, await createSupabaseServerClient()),
  );
}

export async function attachFileToSource(
  input: AttachFileToSourceInput,
): Promise<ActionResult<AttachmentLinkDTO>> {
  return toActionResult(async () =>
    attachFileToSourceService(input, await createSupabaseServerClient()),
  );
}
