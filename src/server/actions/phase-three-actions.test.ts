import { describe, expect, it } from "vitest";
import * as exportActions from "@/server/actions/exports";
import * as flareActions from "@/server/actions/flares";
import * as medicationActions from "@/server/actions/medications";
import * as metricActions from "@/server/actions/metrics";
import * as procedureActions from "@/server/actions/procedures";
import * as sourceActions from "@/server/actions/sources";
import * as diagnosisActions from "@/server/actions/diagnoses";

describe("phase three server actions", () => {
  it("exports callable backend entry points for frontend integration", () => {
    for (const fn of [
      medicationActions.createMedication,
      medicationActions.updateMedication,
      medicationActions.softDeleteMedication,
      medicationActions.listMedications,
      medicationActions.createMedicationResponse,
      medicationActions.updateMedicationResponse,
      medicationActions.softDeleteMedicationResponse,
      medicationActions.listMedicationResponses,
      procedureActions.createProcedureEvent,
      procedureActions.updateProcedureEvent,
      procedureActions.softDeleteProcedureEvent,
      procedureActions.listProcedureEvents,
      sourceActions.createSource,
      sourceActions.updateSource,
      sourceActions.softDeleteSource,
      sourceActions.listSources,
      sourceActions.listSourceLinks,
      sourceActions.linkSourceToEvent,
      sourceActions.linkSourceToDiagnosis,
      sourceActions.linkSourceToDecision,
      sourceActions.attachFileToSource,
      exportActions.generateClinicianExportPacket,
      exportActions.createBulkDataExport,
      metricActions.getDashboardMetrics,
      diagnosisActions.listEvidenceLinks,
      flareActions.listRecentFlareSummaries,
    ]) {
      expect(typeof fn).toBe("function");
    }
  });
});
