import { describe, expect, it } from "vitest";
import { parsePublicBoolean } from "./feature-flags";

describe("mobile feature flag parsing", () => {
  it("uses defaults for missing or invalid values", () => {
    expect(parsePublicBoolean(undefined, true)).toBe(true);
    expect(parsePublicBoolean("", false)).toBe(false);
    expect(parsePublicBoolean("maybe", true)).toBe(true);
  });

  it("accepts common enabled and disabled strings", () => {
    expect(parsePublicBoolean("true", false)).toBe(true);
    expect(parsePublicBoolean("1", false)).toBe(true);
    expect(parsePublicBoolean("off", true)).toBe(false);
    expect(parsePublicBoolean("0", true)).toBe(false);
  });
});
