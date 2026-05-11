import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import { EntryForm } from "@/components/entries/entry-form";
import { listReferenceData } from "@/server/actions/reference";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

interface NewPainEntryPageProps {
  searchParams: Promise<{ quick?: string }>;
}

export default async function NewPainEntryPage({
  searchParams,
}: NewPainEntryPageProps) {
  const params = await searchParams;
  const reference = await listReferenceData();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={strings.painBook.form.newTitle} />
      {!reference.ok ? (
        <ErrorState message={reference.error.message} />
      ) : (
        <EntryForm
          variant="pain"
          mode="create"
          bodyRegions={reference.data.body_regions}
          symptoms={reference.data.symptoms}
          triggers={reference.data.triggers}
          quick={params.quick === "1"}
        />
      )}
    </div>
  );
}
