import { PageHeader } from "@/components/shell/page-header";
import { ExportTabs } from "@/components/exports/export-tabs";
import { ClinicianPacketForm } from "@/components/exports/clinician-packet-form";
import { BulkExportForm } from "@/components/exports/bulk-export-form";

import { listDiagnoses } from "@/server/actions/diagnoses";
import { listReferenceData } from "@/server/actions/reference";
import { loadShellProfile } from "@/components/shell/profile-loader";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

interface ExportPageProps {
  searchParams: Promise<{ tab?: string }>;
}

function pickTab(value: string | undefined): "clinician" | "bulk" {
  return value === "bulk" ? "bulk" : "clinician";
}

function canWrite(role: string | undefined): boolean {
  return role === "primary" || role === "caregiver";
}

export default async function ExportPage({ searchParams }: ExportPageProps) {
  const params = await searchParams;
  const tab = pickTab(params.tab);

  const [profile, diagnosesResult, referenceResult] = await Promise.all([
    loadShellProfile(),
    listDiagnoses({ page_size: 200 }),
    listReferenceData(),
  ]);

  const diagnoses = diagnosesResult.ok ? diagnosesResult.data.items : [];
  const bodyRegions = referenceResult.ok
    ? referenceResult.data.body_regions
    : [];

  const role = profile?.role;
  const allowGenerate = role !== "viewer"; // clinician/primary/caregiver may all generate
  const allowDeleted = canWrite(role);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={strings.exportsNs.title}
        description={strings.exportsNs.subtitle}
        actions={<ExportTabs current={tab} />}
      />

      {tab === "clinician" ? (
        <ClinicianPacketForm
          diagnoses={diagnoses}
          bodyRegions={bodyRegions}
          canGenerate={allowGenerate}
        />
      ) : (
        <BulkExportForm
          canGenerate={allowGenerate}
          canIncludeDeleted={allowDeleted}
        />
      )}
    </div>
  );
}
