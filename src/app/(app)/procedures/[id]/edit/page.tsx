import { redirect } from "next/navigation";
import { canWrite } from "@/lib/auth";
import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import {
  ProcedureForm,
  type SourceOption,
} from "@/components/procedures/procedure-form";
import { getProcedureEvent } from "@/server/actions/procedures";
import { listSources } from "@/server/actions/sources";
import { loadShellProfile } from "@/components/shell/profile-loader";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

interface EditProcedurePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProcedurePage({
  params,
}: EditProcedurePageProps) {
  const { id } = await params;

  const profile = await loadShellProfile();
  if (profile && !canWrite(profile.role)) {
    redirect("/procedures");
  }

  const [eventResult, sourcesResult] = await Promise.all([
    getProcedureEvent(id),
    listSources({ page_size: 200 }),
  ]);

  if (!eventResult.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={strings.procedures.form.editTitle} />
        <ErrorState message={eventResult.error.message} />
      </div>
    );
  }

  const sources: SourceOption[] = sourcesResult.ok
    ? sourcesResult.data.items.map((source) => ({
        id: source.id,
        title: source.title,
      }))
    : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={strings.procedures.form.editTitle} />
      <ProcedureForm
        mode="edit"
        procedureEvent={eventResult.data}
        sources={sources}
      />
    </div>
  );
}
