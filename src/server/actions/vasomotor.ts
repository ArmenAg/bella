"use server";

import {
  createVasomotorMeasurement as createVasomotorMeasurementService,
  getVasomotorMeasurement as getVasomotorMeasurementService,
  listVasomotorMeasurements as listVasomotorMeasurementsService,
  softDeleteVasomotorMeasurement as softDeleteVasomotorMeasurementService,
  updateVasomotorMeasurement as updateVasomotorMeasurementService,
} from "@/server/services/vasomotor";
import { createSupabaseServerClient } from "@/server/supabase/client";
import type {
  CreateVasomotorMeasurementInput,
  VasomotorFilter,
  VasomotorMeasurementDTO,
  UpdateVasomotorMeasurementInput,
} from "@/server/contracts";
import { toActionResult, type ActionResult } from "./result";

export async function createVasomotorMeasurement(
  input: CreateVasomotorMeasurementInput,
): Promise<ActionResult<VasomotorMeasurementDTO>> {
  return toActionResult(async () =>
    createVasomotorMeasurementService(
      input,
      await createSupabaseServerClient(),
    ),
  );
}

export async function updateVasomotorMeasurement(
  input: UpdateVasomotorMeasurementInput,
): Promise<ActionResult<VasomotorMeasurementDTO>> {
  return toActionResult(async () =>
    updateVasomotorMeasurementService(
      input,
      await createSupabaseServerClient(),
    ),
  );
}

export async function softDeleteVasomotorMeasurement(
  id: string,
  reason: string,
): Promise<ActionResult<VasomotorMeasurementDTO>> {
  return toActionResult(async () =>
    softDeleteVasomotorMeasurementService(
      id,
      reason,
      await createSupabaseServerClient(),
    ),
  );
}

export async function getVasomotorMeasurement(
  id: string,
): Promise<ActionResult<VasomotorMeasurementDTO>> {
  return toActionResult(async () =>
    getVasomotorMeasurementService(id, await createSupabaseServerClient()),
  );
}

export async function listVasomotorMeasurements(input: VasomotorFilter) {
  return toActionResult(async () =>
    listVasomotorMeasurementsService(input, await createSupabaseServerClient()),
  );
}
