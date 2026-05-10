import { strings } from "@/lib/strings";
import type { ErrorResponse } from "@/server/contracts";

export type ClientActionResult<T> = { ok: true; data: T } | ErrorResponse;

const errorMessageByCode: Partial<
  Record<ErrorResponse["error"]["code"], string>
> = {
  UNAUTHORIZED: strings.errors.unauthorized,
  FORBIDDEN: strings.errors.forbidden,
  NOT_FOUND: strings.errors.notFound,
  PAYLOAD_TOO_LARGE: strings.errors.tooLarge,
  UNSUPPORTED_MEDIA_TYPE: strings.errors.unsupportedMedia,
  VALIDATION_ERROR: strings.errors.validation,
};

export function userFacingErrorMessage(error: ErrorResponse["error"]): string {
  return (
    errorMessageByCode[error.code] ?? error.message ?? strings.errors.generic
  );
}
