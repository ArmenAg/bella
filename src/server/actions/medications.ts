"use server";

import {
  createMedication as createMedicationService,
  createMedicationResponse as createMedicationResponseService,
  getMedication as getMedicationService,
  getMedicationResponse as getMedicationResponseService,
  listMedicationResponses as listMedicationResponsesService,
  listMedications as listMedicationsService,
  softDeleteMedication as softDeleteMedicationService,
  softDeleteMedicationResponse as softDeleteMedicationResponseService,
  updateMedication as updateMedicationService,
  updateMedicationResponse as updateMedicationResponseService,
} from "@/server/services/medications";
import { createSupabaseServerClient } from "@/server/supabase/client";
import type {
  CreateMedicationInput,
  CreateMedicationResponseInput,
  Medication,
  MedicationFilter,
  MedicationResponse,
  MedicationResponseFilter,
  UpdateMedicationInput,
  UpdateMedicationResponseInput,
} from "@/server/contracts";
import { toActionResult, type ActionResult } from "./result";

export async function createMedication(
  input: CreateMedicationInput,
): Promise<ActionResult<Medication>> {
  return toActionResult(async () =>
    createMedicationService(input, await createSupabaseServerClient()),
  );
}

export async function updateMedication(
  input: UpdateMedicationInput,
): Promise<ActionResult<Medication>> {
  return toActionResult(async () =>
    updateMedicationService(input, await createSupabaseServerClient()),
  );
}

export async function softDeleteMedication(
  id: string,
  reason: string,
): Promise<ActionResult<Medication>> {
  return toActionResult(async () =>
    softDeleteMedicationService(id, reason, await createSupabaseServerClient()),
  );
}

export async function getMedication(
  id: string,
): Promise<ActionResult<Medication>> {
  return toActionResult(async () =>
    getMedicationService(id, await createSupabaseServerClient()),
  );
}

export async function getMedicationResponse(
  id: string,
): Promise<ActionResult<MedicationResponse>> {
  return toActionResult(async () =>
    getMedicationResponseService(id, await createSupabaseServerClient()),
  );
}

export async function listMedications(input: MedicationFilter) {
  return toActionResult(async () =>
    listMedicationsService(input, await createSupabaseServerClient()),
  );
}

export async function createMedicationResponse(
  input: CreateMedicationResponseInput,
): Promise<ActionResult<MedicationResponse>> {
  return toActionResult(async () =>
    createMedicationResponseService(input, await createSupabaseServerClient()),
  );
}

export async function updateMedicationResponse(
  input: UpdateMedicationResponseInput,
): Promise<ActionResult<MedicationResponse>> {
  return toActionResult(async () =>
    updateMedicationResponseService(input, await createSupabaseServerClient()),
  );
}

export async function softDeleteMedicationResponse(
  id: string,
  reason: string,
): Promise<ActionResult<MedicationResponse>> {
  return toActionResult(async () =>
    softDeleteMedicationResponseService(
      id,
      reason,
      await createSupabaseServerClient(),
    ),
  );
}

export async function listMedicationResponses(input: MedicationResponseFilter) {
  return toActionResult(async () =>
    listMedicationResponsesService(input, await createSupabaseServerClient()),
  );
}
