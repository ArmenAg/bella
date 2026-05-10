import { describe, expect, it } from "vitest";

import * as decisionActions from "@/server/actions/decisions";
import * as diagnosesActions from "@/server/actions/diagnoses";
import * as medicationActions from "@/server/actions/medications";
import * as procedureActions from "@/server/actions/procedures";
import * as scheduleActions from "@/server/actions/schedule";
import * as sourceActions from "@/server/actions/sources";
import * as vasomotorActions from "@/server/actions/vasomotor";

/**
 * Regression for the integration-QA finding that edit pages were silently
 * failing for items beyond the first page of `listX({ page_size: 200 })`.
 * Each surface now exposes a single-row getter; the edit page calls this
 * action by id and renders an error rather than a stale "not found".
 *
 * If you remove one of these exports, an edit page will break.
 */
describe("integration QA single-row getters", () => {
  it("exposes a getter action for every edit page surface", () => {
    const getters = [
      decisionActions.getDecision,
      diagnosesActions.getDiagnosis,
      medicationActions.getMedication,
      medicationActions.getMedicationResponse,
      procedureActions.getProcedureEvent,
      scheduleActions.getAppointment,
      scheduleActions.getTask,
      sourceActions.getSource,
      vasomotorActions.getVasomotorMeasurement,
    ];
    for (const fn of getters) {
      expect(typeof fn).toBe("function");
    }
  });
});
