import { describe, expect, it } from "vitest";
import { normalizeProcedureEventRow } from "@/server/services/procedures";

describe("procedure event service helpers", () => {
  it("normalizes procedure/test impact fields", () => {
    expect(
      normalizeProcedureEventRow({
        id: "10000000-0000-4000-8000-000000000021",
        family_id: "10000000-0000-4000-8000-000000000022",
        user_id: "10000000-0000-4000-8000-000000000023",
        type: "procedure_test",
        occurred_at: "2026-05-10T12:00:00.000Z",
        title: "Demo procedure",
        diagnostic_question: "Did this clarify the generator?",
        baseline_before: "baseline",
        immediate_effect: "immediate",
        effect_24h: "24h",
        effect_72h: "72h",
        effect_1w: "1w",
        effect_1m: "1m",
        new_symptoms: "none",
        answered_question: "partially",
        repeat_recommendation: "review first",
        created_at: "2026-05-10T12:00:00.000Z",
        updated_at: "2026-05-10T12:00:00.000Z",
      }),
    ).toMatchObject({
      type: "procedure_test",
      diagnostic_question: "Did this clarify the generator?",
      answered_question: "partially",
      repeat_recommendation: "review first",
      deleted_at: null,
    });
  });
});
