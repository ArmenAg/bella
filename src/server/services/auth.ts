import type { SupabaseClient } from "@supabase/supabase-js";

export type AppRole = "primary" | "caregiver" | "viewer" | "clinician_readonly";

export type CurrentProfile = {
  id: string;
  family_id: string;
  email: string;
  role: AppRole;
};

type ProfileRow = {
  id: string;
  family_id: string;
  email: string;
  roles: { slug: AppRole } | { slug: AppRole }[] | null;
};

function extractRole(row: ProfileRow): AppRole {
  const role = Array.isArray(row.roles) ? row.roles[0]?.slug : row.roles?.slug;

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
    throw new Error("Authentication required");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,family_id,email,roles(slug)")
    .eq("id", user.id)
    .single();

  if (error) {
    throw error;
  }

  const profile = data as unknown as ProfileRow;

  return {
    id: profile.id,
    family_id: profile.family_id,
    email: profile.email,
    role: extractRole(profile),
  };
}

export function assertCanWrite(profile: CurrentProfile) {
  if (profile.role !== "primary" && profile.role !== "caregiver") {
    throw new Error("Current role is read-only");
  }
}
