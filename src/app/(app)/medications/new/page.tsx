import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { MedicationForm } from "@/components/medications/medication-form";
import { loadShellProfile } from "@/components/shell/profile-loader";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

export default async function NewMedicationPage() {
  const profile = await loadShellProfile();
  if (profile && profile.role !== "primary" && profile.role !== "caregiver") {
    redirect("/medications");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={strings.medications.form.newTitle} />
      <MedicationForm mode="create" />
    </div>
  );
}
