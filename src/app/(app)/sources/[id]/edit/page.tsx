import { ErrorState } from "@/components/feedback/error-state";
import { canWrite } from "@/lib/auth";
import { PageHeader } from "@/components/shell/page-header";
import { SourceForm } from "@/components/sources/source-form";

import { getSource, listSourceLinks } from "@/server/actions/sources";
import { listDecisions } from "@/server/actions/decisions";
import { listDiagnoses } from "@/server/actions/diagnoses";
import { loadShellProfile } from "@/components/shell/profile-loader";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

interface EditSourcePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSourcePage({ params }: EditSourcePageProps) {
  const { id } = await params;

  const [
    profile,
    sourceResult,
    sourceLinksResult,
    diagnosesResult,
    decisionsResult,
  ] = await Promise.all([
    loadShellProfile(),
    getSource(id),
    listSourceLinks(id),
    listDiagnoses({ page_size: 200 }),
    listDecisions({ page_size: 200 }),
  ]);

  if (!sourceResult.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={strings.sources.form.editTitle} />
        <ErrorState message={sourceResult.error.message} />
      </div>
    );
  }

  const source = sourceResult.data;
  const diagnoses = diagnosesResult.ok ? diagnosesResult.data.items : [];
  const decisions = decisionsResult.ok ? decisionsResult.data.items : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={strings.sources.form.editTitle}
        description={source.title}
      />
      <SourceForm
        mode="edit"
        source={source}
        sourceLinks={sourceLinksResult.ok ? sourceLinksResult.data : undefined}
        diagnoses={diagnoses}
        decisions={decisions}
        canWrite={canWrite(profile?.role)}
      />
    </div>
  );
}
