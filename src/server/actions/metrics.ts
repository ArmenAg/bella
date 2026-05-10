"use server";

import { getDashboardMetrics as getDashboardMetricsService } from "@/server/services/metrics";
import { createSupabaseServerClient } from "@/server/supabase/client";
import type { DashboardMetrics, MetricsFilter } from "@/server/contracts";
import { toActionResult, type ActionResult } from "./result";

export async function getDashboardMetrics(
  input: MetricsFilter,
): Promise<ActionResult<DashboardMetrics>> {
  return toActionResult(async () =>
    getDashboardMetricsService(input, await createSupabaseServerClient()),
  );
}
