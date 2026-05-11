import { ErrorState } from "@/components/feedback/error-state";
import { canWrite } from "@/lib/auth";
import { PageHeader } from "@/components/shell/page-header";
import { DiagnosisForm } from "@/components/diagnoses/diagnosis-form";
import { DiagnosisEvidenceSection } from "@/components/diagnoses/diagnosis-evidence-section";
import { loadShellProfile } from "@/components/shell/profile-loader";

import {
  getDiagnosis,
  listDiagnoses,
  listEvidenceLinks,
} from "@/server/actions/diagnoses";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

interface EditDiagnosisPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDiagnosisPage({
  params,
}: EditDiagnosisPageProps) {
  const { id } = await params;
  const profile = await loadShellProfile();
  const writable = canWrite(profile?.role);

  const [nodeResult, listResult, evidenceResult] = await Promise.all([
    getDiagnosis(id),
    listDiagnoses({ page_size: 200 }),
    listEvidenceLinks({ diagnosis_id: id, page_size: 200 }),
  ]);

  if (!nodeResult.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={strings.diagnoses.form.editTitle} />
        <ErrorState message={nodeResult.error.message} />
      </div>
    );
  }

  const node = nodeResult.data;
  const allNodes = listResult.ok ? listResult.data.items : [node];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={strings.diagnoses.form.editTitle}
        description={node.title}
      />
      <DiagnosisForm
        mode="edit"
        node={node}
        allNodes={allNodes}
        canDelete={writable}
      />
      <DiagnosisEvidenceSection
        diagnosisId={node.id}
        initialLinks={evidenceResult.ok ? evidenceResult.data.items : []}
        canWrite={writable}
      />
    </div>
  );
}
