import "server-only";
import { createSupabaseServerClient } from "@/server/supabase/client";
import {
  requireCurrentProfile,
  type CurrentProfile,
} from "@/server/services/auth";

/**
 * Resolve the current profile for the shell. Returns `null` when the user is
 * not signed in or when Supabase isn't configured for this environment, so
 * that local development can still render the chrome.
 */
export async function loadShellProfile(): Promise<CurrentProfile | null> {
  try {
    const supabase = await createSupabaseServerClient();
    return await requireCurrentProfile(supabase);
  } catch {
    return null;
  }
}
