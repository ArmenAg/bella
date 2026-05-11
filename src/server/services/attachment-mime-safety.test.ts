import { describe, expect, it } from "vitest";
import {
  allowedMimeTypes,
  allowedMimeTypeSchema,
  createAttachmentInputSchema,
  createUploadUrlInputSchema,
  MAX_UPLOAD_SIZE_BYTES,
} from "@/server/contracts";

/**
 * Regression guards for the attachment surface:
 *
 * 1. `application/zip` and `application/x-zip-compressed` remain in the
 *    allow-list because Apple Health exports are zip files. If a future
 *    refactor drops them, the AH upload flow breaks.
 * 2. Apple Health raw exports are tagged with
 *    `metadata.apple_health_export = true` so the importer can recognize
 *    them and downstream surfaces can treat them as sensitive import
 *    artifacts. The metadata round-trips through the contract.
 * 3. The 500 MB upload cap is intentional — large Apple Health exports
 *    routinely run multi-hundred MB. A regression that shrinks it would
 *    silently block users mid-upload.
 */
describe("attachment mime / size safety", () => {
  it("allows the two zip mime types Apple Health uses", () => {
    expect(allowedMimeTypeSchema.safeParse("application/zip").success).toBe(
      true,
    );
    expect(
      allowedMimeTypeSchema.safeParse("application/x-zip-compressed").success,
    ).toBe(true);
    expect(allowedMimeTypes).toEqual(
      expect.arrayContaining([
        "application/zip",
        "application/x-zip-compressed",
      ]),
    );
  });

  it("rejects executables and other dangerous mime types", () => {
    for (const mime of [
      "application/x-msdownload",
      "application/x-sh",
      "application/octet-stream",
      "application/x-php",
    ]) {
      expect(allowedMimeTypeSchema.safeParse(mime).success).toBe(false);
    }
  });

  it("preserves apple_health_export metadata through createAttachment input", () => {
    const parsed = createAttachmentInputSchema.parse({
      file_name: "export.zip",
      mime_type: "application/zip",
      size_bytes: 1024,
      file_path: "family-id/user-id/uuid-export.zip",
      gps_stripped: false,
      metadata: { apple_health_export: true },
    });
    expect(parsed.metadata).toEqual({ apple_health_export: true });
  });

  it("rejects uploads larger than the 500 MB cap", () => {
    const oneByteOverCap = MAX_UPLOAD_SIZE_BYTES + 1;
    const result = createUploadUrlInputSchema.safeParse({
      file_name: "export.zip",
      mime_type: "application/zip",
      size_bytes: oneByteOverCap,
    });
    expect(result.success).toBe(false);
  });

  it("keeps the 500 MB cap (regression: 500 MB, not 50 MB)", () => {
    expect(MAX_UPLOAD_SIZE_BYTES).toBe(500 * 1024 * 1024);
  });
});
