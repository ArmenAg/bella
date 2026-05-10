import "server-only";
import { getActiveFlare } from "@/server/actions/flares";
import type { FlareSessionDTO } from "@/server/contracts";

/**
 * Resolve the current active flare for the shell. Returns `null` when no
 * active flare exists or when the user isn't authenticated. Errors are
 * swallowed so a missing session can't break the shell.
 */
export async function loadActiveFlare(): Promise<FlareSessionDTO | null> {
  try {
    const result = await getActiveFlare();
    if (!result.ok) return null;
    return result.data ?? null;
  } catch {
    return null;
  }
}
