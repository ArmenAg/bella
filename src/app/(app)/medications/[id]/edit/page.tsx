import { redirect } from "next/navigation";
import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import { MedicationForm } from "@/components/medications/medication-form";
import { getMedication } from "@/server/actions/medications";
import { loadShellProfile } from "@/components/shell/profile-loader";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

interface EditMedicationPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMedicationPage({
  params,
}: EditMedicationPageProps) {
  const { id } = await params;
  const profile = await loadShellProfile();
  if (profile && profile.role !== "primary" && profile.role !== "caregiver") {
    redirect("/medications");
  }

  const result = await getMedication(id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={strings.medications.form.editTitle} />
      {!result.ok ? (
        <ErrorState message={result.error.message} />
      ) : (
        <MedicationForm mode="edit" medication={result.data} />
      )}
    </div>
  );
}
