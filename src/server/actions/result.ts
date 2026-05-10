import { ZodError } from "zod";
import type { ErrorCode, ErrorResponse } from "@/server/contracts";

export type ActionResult<T> = { ok: true; data: T } | ErrorResponse;

function toErrorCode(error: unknown): ErrorCode {
  if (error instanceof ZodError) {
    return "VALIDATION_ERROR";
  }

  if (!(error instanceof Error)) {
    return "INTERNAL_ERROR";
  }

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
    return {
      ok: false,
      error: {
        code: toErrorCode(error),
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
