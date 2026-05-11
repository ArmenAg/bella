import type { CurrentProfile } from "@/server/services/auth";

export type RoleSlug = CurrentProfile["role"];

const WRITE_ROLES: ReadonlySet<RoleSlug> = new Set(["primary", "caregiver"]);

/**
 * Returns true when the given role may create/edit/destroy family records.
 * `primary` and `caregiver` are writers; `viewer` and `clinician_readonly` are not.
 * Accepts `undefined` so callers can pass `profile?.role` directly.
 */
export function canWrite(role: RoleSlug | string | undefined | null): boolean {
  if (!role) return false;
  return WRITE_ROLES.has(role as RoleSlug);
}
