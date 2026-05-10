import { describe, expect, it } from "vitest";
import {
  assertAllowedMimeType,
  sniffMimeFromBytes,
} from "@/server/services/attachments";

describe("attachment service helpers", () => {
  it("sniffs common supported file signatures", () => {
    expect(sniffMimeFromBytes(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(
      "image/jpeg",
    );
    expect(
      sniffMimeFromBytes(
        Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe("image/png");
    expect(sniffMimeFromBytes(new TextEncoder().encode("%PDF-1.7"))).toBe(
      "application/pdf",
    );
  });

  it("rejects unsupported mime types", () => {
    expect(() => assertAllowedMimeType("image/svg+xml")).toThrow(
      /Unsupported attachment mime type/,
    );
    expect(() => assertAllowedMimeType("image/jpeg")).not.toThrow();
  });
});
