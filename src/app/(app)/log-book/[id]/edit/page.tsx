import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import { EntryForm } from "@/components/entries/entry-form";
import { getEntry } from "@/server/actions/entries";
import { listReferenceData } from "@/server/actions/reference";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

interface EditLogEntryPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditLogEntryPage({
  params,
}: EditLogEntryPageProps) {
  const { id } = await params;
  const [entry, reference] = await Promise.all([
    getEntry(id),
    listReferenceData(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={strings.logBook.form.editTitle} />
      {!entry.ok ? (
        <ErrorState
          title={strings.errors.notFound}
          message={entry.error.message}
        />
      ) : !reference.ok ? (
        <ErrorState message={reference.error.message} />
      ) : (
        <EntryForm
          variant="log"
          mode="edit"
          entry={entry.data}
          bodyRegions={reference.data.body_regions}
          symptoms={reference.data.symptoms}
          triggers={reference.data.triggers}
        />
      )}
    </div>
  );
}
