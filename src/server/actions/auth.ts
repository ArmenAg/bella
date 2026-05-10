"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/server/supabase/client";
import { toActionResult, type ActionResult } from "./result";

const signInInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type SignInInput = z.infer<typeof signInInputSchema>;

export type LoginFormState = {
  error?: string;
};

function safeNext(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "/dashboard";
  }
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  return value;
}

export async function signInWithPassword(
  input: SignInInput,
): Promise<ActionResult<{ user_id: string }>> {
  return toActionResult(async () => {
    const parsed = signInInputSchema.parse(input);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed);

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error("Authentication required");
    }

    revalidatePath("/", "layout");

    return { user_id: data.user.id };
  });
}

export async function signOut(): Promise<ActionResult<{ signed_out: true }>> {
  return toActionResult(async () => {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    revalidatePath("/", "layout");

    return { signed_out: true };
  });
}

export async function signInWithPasswordForm(
  _state: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const result = await signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!result.ok) {
    return { error: result.error.message };
  }

  redirect(safeNext(formData.get("next")));
}
