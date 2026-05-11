import { redirect } from "next/navigation";
import { canWrite } from "@/lib/auth";
import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import {
  ProcedureForm,
  type SourceOption,
} from "@/components/procedures/procedure-form";
import { listSources } from "@/server/actions/sources";
import { loadShellProfile } from "@/components/shell/profile-loader";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

export default async function NewProcedurePage() {
  const profile = await loadShellProfile();
  if (profile && !canWrite(profile.role)) {
    redirect("/procedures");
  }

  const sourcesResult = await listSources({ page_size: 200 });

  if (!sourcesResult.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={strings.procedures.form.newTitle} />
        <ErrorState message={sourcesResult.error.message} />
      </div>
    );
  }

  const sources: SourceOption[] = sourcesResult.data.items.map((source) => ({
    id: source.id,
    title: source.title,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={strings.procedures.form.newTitle} />
      <ProcedureForm mode="create" sources={sources} />
    </div>
  );
}
