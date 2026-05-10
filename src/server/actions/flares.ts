"use server";

import {
  addFlareCheckpoint as addFlareCheckpointService,
  endFlare as endFlareService,
  getActiveFlare as getActiveFlareService,
  listRecentFlareSummaries as listRecentFlareSummariesService,
  startFlare as startFlareService,
  updateFlare as updateFlareService,
} from "@/server/services/flares";
import { createSupabaseServerClient } from "@/server/supabase/client";
import type {
  ActiveFlareResult,
  EndFlareInput,
  FlareCheckpointInput,
  FlareSessionDTO,
  RecentFlareSummary,
  RecentFlareSummaryFilter,
  StartFlareInput,
  UpdateFlareInput,
} from "@/server/contracts";
import { toActionResult, type ActionResult } from "./result";

export async function startFlare(
  input: StartFlareInput,
): Promise<ActionResult<FlareSessionDTO>> {
  return toActionResult(async () =>
    startFlareService(input, await createSupabaseServerClient()),
  );
}

export async function addFlareCheckpoint(
  input: FlareCheckpointInput,
): Promise<ActionResult<FlareSessionDTO>> {
  return toActionResult(async () =>
    addFlareCheckpointService(input, await createSupabaseServerClient()),
  );
}

export async function updateFlare(
  input: UpdateFlareInput,
): Promise<ActionResult<FlareSessionDTO>> {
  return toActionResult(async () =>
    updateFlareService(input, await createSupabaseServerClient()),
  );
}

export async function endFlare(
  input: EndFlareInput,
): Promise<ActionResult<FlareSessionDTO>> {
  return toActionResult(async () =>
    endFlareService(input, await createSupabaseServerClient()),
  );
}

export async function getActiveFlare(): Promise<
  ActionResult<ActiveFlareResult>
> {
  return toActionResult(async () =>
    getActiveFlareService(await createSupabaseServerClient()),
  );
}

export async function listRecentFlareSummaries(
  input: RecentFlareSummaryFilter,
): Promise<
  ActionResult<{
    items: RecentFlareSummary[];
    next_cursor: string | null;
    page_size: number;
  }>
> {
  return toActionResult(async () =>
    listRecentFlareSummariesService(input, await createSupabaseServerClient()),
  );
}
