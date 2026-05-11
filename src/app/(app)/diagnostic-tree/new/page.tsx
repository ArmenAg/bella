import { redirect } from "next/navigation";
import { canWrite } from "@/lib/auth";

import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import { DiagnosisForm } from "@/components/diagnoses/diagnosis-form";
import { loadShellProfile } from "@/components/shell/profile-loader";

import { listDiagnoses } from "@/server/actions/diagnoses";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

export default async function NewDiagnosisPage() {
  const profile = await loadShellProfile();
  if (!canWrite(profile?.role)) {
    redirect("/diagnostic-tree");
  }

  const result = await listDiagnoses({ page_size: 200 });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={strings.diagnoses.form.newTitle} />
      {!result.ok ? (
        <ErrorState message={result.error.message} />
      ) : (
        <DiagnosisForm
          mode="create"
          allNodes={result.data.items}
          canDelete={false}
        />
      )}
    </div>
  );
}
