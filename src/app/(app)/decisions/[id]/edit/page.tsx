import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import { DecisionForm } from "@/components/decisions/decision-form";
import { getDecision } from "@/server/actions/decisions";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

interface EditDecisionPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDecisionPage({
  params,
}: EditDecisionPageProps) {
  const { id } = await params;
  const result = await getDecision(id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={strings.decisions.form.editTitle} />
      {!result.ok ? (
        <ErrorState message={result.error.message} />
      ) : (
        <DecisionForm mode="edit" decision={result.data} />
      )}
    </div>
  );
}
