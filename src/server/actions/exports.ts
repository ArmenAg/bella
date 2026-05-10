"use server";

import {
  createBulkDataExport as createBulkDataExportService,
  generateClinicianExportPacket as generateClinicianExportPacketService,
} from "@/server/services/exports";
import { createSupabaseServerClient } from "@/server/supabase/client";
import type {
  BulkExport,
  BulkExportRequest,
  ExportPacket,
  ExportPacketRequest,
} from "@/server/contracts";
import { toActionResult, type ActionResult } from "./result";

export async function generateClinicianExportPacket(
  input: ExportPacketRequest,
): Promise<ActionResult<ExportPacket>> {
  return toActionResult(async () =>
    generateClinicianExportPacketService(
      input,
      await createSupabaseServerClient(),
    ),
  );
}

export async function createBulkDataExport(
  input: BulkExportRequest,
): Promise<ActionResult<BulkExport>> {
  return toActionResult(async () =>
    createBulkDataExportService(input, await createSupabaseServerClient()),
  );
}
