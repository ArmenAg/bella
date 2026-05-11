"use server";

import type {
  AppleHealthDailySummary,
  AppleHealthDailySummaryFilter,
  AppleHealthImport,
  AppleHealthImportFilter,
  AppleHealthImportResult,
  AppleHealthSample,
  AppleHealthSampleFilter,
  CreateAppleHealthImportInput,
} from "@/server/contracts";
import {
  getAppleHealthImport as getAppleHealthImportService,
  importAppleHealthExport as importAppleHealthExportService,
  listAppleHealthDailySummaries as listAppleHealthDailySummariesService,
  listAppleHealthImports as listAppleHealthImportsService,
  listAppleHealthSamples as listAppleHealthSamplesService,
} from "@/server/services/apple-health";
import { createSupabaseServerClient } from "@/server/supabase/client";
import { toActionResult, type ActionResult } from "./result";

export async function importAppleHealthExport(
  input: CreateAppleHealthImportInput,
): Promise<ActionResult<AppleHealthImportResult>> {
  return toActionResult(async () =>
    importAppleHealthExportService(input, await createSupabaseServerClient()),
  );
}

export async function getAppleHealthImport(
  id: string,
): Promise<ActionResult<AppleHealthImport>> {
  return toActionResult(async () =>
    getAppleHealthImportService(id, await createSupabaseServerClient()),
  );
}

export async function listAppleHealthImports(input: AppleHealthImportFilter) {
  return toActionResult(async () =>
    listAppleHealthImportsService(input, await createSupabaseServerClient()),
  );
}

export async function listAppleHealthSamples(input: AppleHealthSampleFilter) {
  return toActionResult(async () =>
    listAppleHealthSamplesService(input, await createSupabaseServerClient()),
  );
}

export async function listAppleHealthDailySummaries(
  input: AppleHealthDailySummaryFilter,
) {
  return toActionResult(async () =>
    listAppleHealthDailySummariesService(
      input,
      await createSupabaseServerClient(),
    ),
  );
}

export type { AppleHealthDailySummary, AppleHealthImport, AppleHealthSample };
