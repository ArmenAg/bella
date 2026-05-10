import { redirect } from "next/navigation";
import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import {
  MedicationResponseForm,
  type EntryOption,
  type MedicationOption,
} from "@/components/medications/response-form";
import { listEntries } from "@/server/actions/entries";
import {
  getMedicationResponse,
  listMedications,
} from "@/server/actions/medications";
import { loadShellProfile } from "@/components/shell/profile-loader";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

interface EditMedicationResponsePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMedicationResponsePage({
  params,
}: EditMedicationResponsePageProps) {
  const { id } = await params;

  const profile = await loadShellProfile();
  if (profile && profile.role !== "primary" && profile.role !== "caregiver") {
    redirect("/medications?tab=responses");
  }

  const [responseResult, medsResult, entriesResult] = await Promise.all([
    getMedicationResponse(id),
    listMedications({ page_size: 200 }),
    listEntries({ page_size: 50, flare_only: true }),
  ]);

  if (!responseResult.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={strings.medications.response.editTitle} />
        <ErrorState message={responseResult.error.message} />
      </div>
    );
  }

  if (!medsResult.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={strings.medications.response.editTitle} />
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
      <PageHeader title={strings.medications.response.editTitle} />
      <MedicationResponseForm
        mode="edit"
        response={responseResult.data}
        medications={medications}
        entries={entries}
      />
    </div>
  );
}
