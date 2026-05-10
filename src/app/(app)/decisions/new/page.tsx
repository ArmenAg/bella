import { PageHeader } from "@/components/shell/page-header";
import { DecisionForm } from "@/components/decisions/decision-form";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

export default function NewDecisionPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={strings.decisions.form.newTitle} />
      <DecisionForm mode="create" />
    </div>
  );
}
