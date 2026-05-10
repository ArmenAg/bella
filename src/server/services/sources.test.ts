import { describe, expect, it } from "vitest";
import { normalizeSourceRow } from "@/server/services/sources";

describe("source service helpers", () => {
  it("normalizes source-library rows with tags", () => {
    expect(
      normalizeSourceRow({
        id: "10000000-0000-4000-8000-000000000031",
        family_id: "10000000-0000-4000-8000-000000000032",
        user_id: "10000000-0000-4000-8000-000000000033",
        title: "Imported report",
        source_type: "generated_report",
        source_date: "2026-05-08",
        provider: "Workspace",
        citation: "reports_md/example.md",
        summary: "Conservative source row.",
        tags: ["imported", "workspace"],
        created_at: "2026-05-10T12:00:00.000Z",
        updated_at: "2026-05-10T12:00:00.000Z",
      }),
    ).toMatchObject({
      title: "Imported report",
      source_type: "generated_report",
      tags: ["imported", "workspace"],
      deleted_at: null,
    });
  });
});
