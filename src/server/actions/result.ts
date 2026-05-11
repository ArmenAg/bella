import { ZodError } from "zod";
import type { ErrorCode, ErrorResponse } from "@/server/contracts";
import {
  AuthenticationRequiredError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
} from "@/server/services/errors";

export type ActionResult<T> = { ok: true; data: T } | ErrorResponse;

const GENERIC_INTERNAL_ERROR_MESSAGE =
  "An unexpected error occurred. Please try again.";

function toErrorCode(error: unknown): ErrorCode {
  if (error instanceof ZodError) {
    return "VALIDATION_ERROR";
  }

  if (!(error instanceof Error)) {
    return "INTERNAL_ERROR";
  }

  // Typed errors thrown by our own services/actions take precedence —
  // these are deterministic and not affected by upstream message edits.
  if (error instanceof AuthenticationRequiredError) {
    return "UNAUTHORIZED";
  }
  if (error instanceof ForbiddenError) {
    return "FORBIDDEN";
  }
  if (error instanceof NotFoundError) {
    return "NOT_FOUND";
  }
  if (error instanceof ConflictError) {
    return "CONFLICT";
  }
  if (error instanceof UnsupportedMediaTypeError) {
    return "UNSUPPORTED_MEDIA_TYPE";
  }
  if (error instanceof PayloadTooLargeError) {
    return "PAYLOAD_TOO_LARGE";
  }

  // Substring fallback for errors thrown by code we don't control
  // (e.g. Supabase auth: "Auth session missing", Postgres: "not found").
  if (
    error.message.includes("Authentication required") ||
    error.message.includes("Auth session missing")
  ) {
    return "UNAUTHORIZED";
  }

  if (
    error.message.includes("read-only") ||
    error.message.includes("FORBIDDEN")
  ) {
    return "FORBIDDEN";
  }

  if (error.message.includes("not found")) {
    return "NOT_FOUND";
  }

  if (error.message.includes("already exists")) {
    return "CONFLICT";
  }

  if (error.message.includes("mime") || error.message.includes("media")) {
    return "UNSUPPORTED_MEDIA_TYPE";
  }

  if (error.message.includes("size")) {
    return "PAYLOAD_TOO_LARGE";
  }

  return "INTERNAL_ERROR";
}

export async function toActionResult<T>(
  handler: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return {
      ok: true,
      data: await handler(),
    };
  } catch (error) {
    const isZod = error instanceof ZodError;
    const code = toErrorCode(error);

    // For the catch-all INTERNAL_ERROR branch, the underlying message may
    // contain Supabase/Postgres internals (constraint names, schema hints,
    // driver stack info) that should not leak to the client. Log the full
    // error server-side and respond with a generic message instead.
    if (code === "INTERNAL_ERROR" && !isZod) {
      console.error("[action]", error);
      return {
        ok: false,
        error: {
          code,
          message: GENERIC_INTERNAL_ERROR_MESSAGE,
        },
      };
    }

    return {
      ok: false,
      error: {
        code,
        message: isZod
          ? "Request validation failed"
          : error instanceof Error
            ? error.message
            : "Unknown server error",
        ...(isZod ? { details: error.issues } : {}),
      },
    };
  }
}
