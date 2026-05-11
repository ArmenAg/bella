import { redirect } from "next/navigation";
import { canWrite } from "@/lib/auth";

import { PageHeader } from "@/components/shell/page-header";
import { SourceForm } from "@/components/sources/source-form";
import { ErrorState } from "@/components/feedback/error-state";
import { listDecisions } from "@/server/actions/decisions";
import { listDiagnoses } from "@/server/actions/diagnoses";
import { loadShellProfile } from "@/components/shell/profile-loader";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

export default async function NewSourcePage() {
  const profile = await loadShellProfile();
  if (!canWrite(profile?.role)) {
    redirect("/sources");
  }

  const [diagnosesResult, decisionsResult] = await Promise.all([
    listDiagnoses({ page_size: 200 }),
    listDecisions({ page_size: 200 }),
  ]);

  const diagnoses = diagnosesResult.ok ? diagnosesResult.data.items : [];
  const decisions = decisionsResult.ok ? decisionsResult.data.items : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={strings.sources.form.newTitle} />
      {!diagnosesResult.ok && !decisionsResult.ok ? (
        <ErrorState message={diagnosesResult.error.message} />
      ) : (
        <SourceForm
          mode="create"
          diagnoses={diagnoses}
          decisions={decisions}
          canWrite
        />
      )}
    </div>
  );
}
