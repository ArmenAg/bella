"use server";

/**
 * Thin read-only action that returns seeded reference catalogs (body regions,
 * symptoms, triggers) for the frontend forms. Frontend components must not
 * query Supabase directly; this action exists so the Pain Book and Log Book
 * forms can offer real, ID-bearing options.
 */

import { createSupabaseServerClient } from "@/server/supabase/client";
import {
  referenceDataDTOSchema,
  type ReferenceDataDTO,
} from "@/server/contracts";
import { requireCurrentProfile } from "@/server/services/auth";
import { toActionResult, type ActionResult } from "./result";

export async function listReferenceData(): Promise<
  ActionResult<ReferenceDataDTO>
> {
  return toActionResult(async () => {
    const supabase = await createSupabaseServerClient();
    await requireCurrentProfile(supabase);

    const [regionsResult, symptomsResult, triggersResult] = await Promise.all([
      supabase
        .from("body_regions")
        .select("id,slug,name,side,parent_region_id,display_order")
        .is("deleted_at", null)
        .order("display_order", { ascending: true }),
      supabase
        .from("symptoms")
        .select("id,slug,name,category,display_order")
        .is("deleted_at", null)
        .order("display_order", { ascending: true }),
      supabase
        .from("triggers")
        .select("id,slug,name,category,is_bella_specific,display_order")
        .is("deleted_at", null)
        .order("display_order", { ascending: true }),
    ]);

    if (regionsResult.error) throw regionsResult.error;
    if (symptomsResult.error) throw symptomsResult.error;
    if (triggersResult.error) throw triggersResult.error;

    return referenceDataDTOSchema.parse({
      body_regions: regionsResult.data ?? [],
      symptoms: symptomsResult.data ?? [],
      triggers: triggersResult.data ?? [],
    });
  });
}
