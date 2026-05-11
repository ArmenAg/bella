import { redirect } from "next/navigation";
import { canWrite } from "@/lib/auth";
import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import {
  MedicationResponseForm,
  type EntryOption,
  type MedicationOption,
} from "@/components/medications/response-form";
import { listEntries } from "@/server/actions/entries";
import { listMedications } from "@/server/actions/medications";
import { loadShellProfile } from "@/components/shell/profile-loader";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

interface NewMedicationResponsePageProps {
  searchParams: Promise<{ medication_id?: string }>;
}

export default async function NewMedicationResponsePage({
  searchParams,
}: NewMedicationResponsePageProps) {
  const params = await searchParams;
  const profile = await loadShellProfile();
  if (profile && !canWrite(profile.role)) {
    redirect("/medications?tab=responses");
  }

  const [medsResult, entriesResult] = await Promise.all([
    listMedications({ page_size: 200 }),
    listEntries({ page_size: 50, flare_only: true }),
  ]);

  if (!medsResult.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={strings.medications.response.newTitle} />
        <ErrorState message={medsResult.error.message} />
      </div>
    );
  }

  const medications: MedicationOption[] = medsResult.data.items.map((med) => ({
    id: med.id,
    name: med.name,
  }));

  const entries: EntryOption[] = entriesResult.ok
    ? entriesResult.data.items.map((entry) => ({
        id: entry.id,
        title: entry.title,
        occurred_at: entry.occurred_at,
      }))
    : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={strings.medications.response.newTitle} />
      <MedicationResponseForm
        mode="create"
        medications={medications}
        entries={entries}
        defaultMedicationId={params.medication_id}
      />
    </div>
  );
}
