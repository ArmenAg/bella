"use server";

import {
  createEntry as createEntryService,
  getEntry as getEntryService,
  listEntries as listEntriesService,
  softDeleteEntry as softDeleteEntryService,
  updateEntry as updateEntryService,
} from "@/server/services/entries";
import { createSupabaseServerClient } from "@/server/supabase/client";
import type {
  CreateEntryInput,
  EntryDTO,
  EntryFilter,
  UpdateEntryInput,
} from "@/server/contracts";
import { toActionResult, type ActionResult } from "./result";

export async function createEntry(
  input: CreateEntryInput,
): Promise<ActionResult<EntryDTO>> {
  return toActionResult(async () =>
    createEntryService(input, await createSupabaseServerClient()),
  );
}

export async function updateEntry(
  input: UpdateEntryInput,
): Promise<ActionResult<EntryDTO>> {
  return toActionResult(async () =>
    updateEntryService(input, await createSupabaseServerClient()),
  );
}

export async function softDeleteEntry(
  id: string,
  reason: string,
): Promise<ActionResult<EntryDTO>> {
  return toActionResult(async () =>
    softDeleteEntryService(id, reason, await createSupabaseServerClient()),
  );
}

export async function getEntry(id: string): Promise<ActionResult<EntryDTO>> {
  return toActionResult(async () =>
    getEntryService(id, await createSupabaseServerClient()),
  );
}

export async function listEntries(input: EntryFilter) {
  return toActionResult(async () =>
    listEntriesService(input, await createSupabaseServerClient()),
  );
}
