"use server";

import {
  createDiagnosis as createDiagnosisService,
  createEvidenceLink as createEvidenceLinkService,
  getDiagnosis as getDiagnosisService,
  listDiagnoses as listDiagnosesService,
  listEvidenceLinks as listEvidenceLinksService,
  mergeDiagnosisNodes as mergeDiagnosisNodesService,
  removeEvidenceLink as removeEvidenceLinkService,
  softDeleteDiagnosis as softDeleteDiagnosisService,
  splitDiagnosisNode as splitDiagnosisNodeService,
  updateDiagnosis as updateDiagnosisService,
  updateEvidenceLink as updateEvidenceLinkService,
} from "@/server/services/diagnoses";
import { createSupabaseServerClient } from "@/server/supabase/client";
import type {
  CreateDiagnosisInput,
  CreateEvidenceLinkInput,
  DiagnosisFilter,
  DiagnosisMergeResult,
  DiagnosisNode,
  DiagnosisSplitResult,
  EvidenceLink,
  EvidenceLinkFilter,
  MergeDiagnosisNodesInput,
  SplitDiagnosisNodeInput,
  UpdateDiagnosisInput,
  UpdateEvidenceLinkInput,
} from "@/server/contracts";
import { toActionResult, type ActionResult } from "./result";

export async function createDiagnosis(
  input: CreateDiagnosisInput,
): Promise<ActionResult<DiagnosisNode>> {
  return toActionResult(async () =>
    createDiagnosisService(input, await createSupabaseServerClient()),
  );
}

export async function updateDiagnosis(
  input: UpdateDiagnosisInput,
): Promise<ActionResult<DiagnosisNode>> {
  return toActionResult(async () =>
    updateDiagnosisService(input, await createSupabaseServerClient()),
  );
}

export async function softDeleteDiagnosis(
  id: string,
  reason: string,
): Promise<ActionResult<DiagnosisNode>> {
  return toActionResult(async () =>
    softDeleteDiagnosisService(id, reason, await createSupabaseServerClient()),
  );
}

export async function getDiagnosis(
  id: string,
): Promise<ActionResult<DiagnosisNode>> {
  return toActionResult(async () =>
    getDiagnosisService(id, await createSupabaseServerClient()),
  );
}

export async function listDiagnoses(input: DiagnosisFilter) {
  return toActionResult(async () =>
    listDiagnosesService(input, await createSupabaseServerClient()),
  );
}

export async function createEvidenceLink(
  input: CreateEvidenceLinkInput,
): Promise<ActionResult<EvidenceLink>> {
  return toActionResult(async () =>
    createEvidenceLinkService(input, await createSupabaseServerClient()),
  );
}

export async function listEvidenceLinks(input: EvidenceLinkFilter) {
  return toActionResult(async () =>
    listEvidenceLinksService(input, await createSupabaseServerClient()),
  );
}

export async function updateEvidenceLink(
  input: UpdateEvidenceLinkInput,
): Promise<ActionResult<EvidenceLink>> {
  return toActionResult(async () =>
    updateEvidenceLinkService(input, await createSupabaseServerClient()),
  );
}

export async function removeEvidenceLink(
  id: string,
): Promise<ActionResult<EvidenceLink>> {
  return toActionResult(async () =>
    removeEvidenceLinkService(id, await createSupabaseServerClient()),
  );
}

export async function mergeDiagnosisNodes(
  input: MergeDiagnosisNodesInput,
): Promise<ActionResult<DiagnosisMergeResult>> {
  return toActionResult(async () =>
    mergeDiagnosisNodesService(input, await createSupabaseServerClient()),
  );
}

export async function splitDiagnosisNode(
  input: SplitDiagnosisNodeInput,
): Promise<ActionResult<DiagnosisSplitResult>> {
  return toActionResult(async () =>
    splitDiagnosisNodeService(input, await createSupabaseServerClient()),
  );
}
