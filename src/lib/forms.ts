import type { FieldErrors, FieldValues } from "react-hook-form";

/**
 * Return the first non-empty validation message from a react-hook-form errors
 * object, or null if no fields have an error message. Used by forms to render
 * a single inline summary alert.
 */
export function firstZodError<T extends FieldValues>(
  errors: FieldErrors<T>,
): string | null {
  for (const key in errors) {
    const value = errors[key];
    if (value && typeof value === "object" && "message" in value) {
      const message = (value as { message?: string }).message;
      if (message) return message;
    }
  }
  return null;
}
