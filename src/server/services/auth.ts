import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { AuthenticationRequiredError, ForbiddenError } from "./errors";

export type AppRole = "primary" | "caregiver" | "viewer" | "clinician_readonly";

export type CurrentProfile = {
  id: string;
  family_id: string;
  email: string;
  role: AppRole;
};

const appRoleSchema = z.enum([
  "primary",
  "caregiver",
  "viewer",
  "clinician_readonly",
]);

const profileRowSchema = z.object({
  id: z.string(),
  family_id: z.string(),
  email: z.string(),
  roles: z.union([
    z.object({ slug: appRoleSchema }),
    z.array(z.object({ slug: appRoleSchema })),
    z.null(),
  ]),
});

type ProfileRow = z.infer<typeof profileRowSchema>;

function extractRole(row: ProfileRow): AppRole {
  if (Array.isArray(row.roles)) {
    if (row.roles.length > 1) {
      throw new Error("Profile has ambiguous role assignment");
    }
    const role = row.roles[0]?.slug;
    if (!role) {
      throw new Error("Profile has no assigned role");
    }
    return role;
  }

  const role = row.roles?.slug;

  if (!role) {
    throw new Error("Profile has no assigned role");
  }

  return role;
}

export async function requireCurrentProfile(
  supabase: SupabaseClient,
): Promise<CurrentProfile> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new AuthenticationRequiredError("Authentication required");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,family_id,email,roles(slug)")
    .eq("id", user.id)
    .single();

  if (error) {
    throw error;
  }

  const profile = profileRowSchema.parse(data);

  return {
    id: profile.id,
    family_id: profile.family_id,
    email: profile.email,
    role: extractRole(profile),
  };
}

export function assertCanWrite(profile: CurrentProfile) {
  if (profile.role !== "primary" && profile.role !== "caregiver") {
    throw new ForbiddenError("Current role is read-only");
  }
}
