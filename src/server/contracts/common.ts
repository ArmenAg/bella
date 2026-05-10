import { z } from "zod";

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;
export const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;
export const SIGNED_URL_TTL_SECONDS = 300;

export const uuidSchema = z.string().uuid();

export const utcDateTimeSchema = z
  .string()
  .datetime({ offset: true })
  .describe(
    "UTC ISO-8601 timestamp. Store as timestamptz; render in the user timezone.",
  );

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const painScoreSchema = z.number().int().min(0).max(10);
export const softDeleteReasonSchema = z.string().trim().min(1).max(2000);

export const paginationInputSchema = z.object({
  cursor: z.string().optional(),
  page_size: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
});

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
) =>
  z.object({
    items: z.array(itemSchema),
    next_cursor: z.string().nullable(),
    page_size: z.number().int().min(1).max(MAX_PAGE_SIZE),
  });

export const errorCodeSchema = z.enum([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "PAYLOAD_TOO_LARGE",
  "UNSUPPORTED_MEDIA_TYPE",
  "VALIDATION_ERROR",
  "INTERNAL_ERROR",
]);

export const errorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
    request_id: z.string().optional(),
  }),
});

export const successResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    ok: z.literal(true),
    data: dataSchema,
  });

export const serviceResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.union([successResponseSchema(dataSchema), errorResponseSchema]);

export type PaginationInput = z.infer<typeof paginationInputSchema>;
export type SoftDeleteReason = z.infer<typeof softDeleteReasonSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type ErrorCode = z.infer<typeof errorCodeSchema>;
