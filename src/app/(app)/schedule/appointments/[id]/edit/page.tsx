import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import { AppointmentForm } from "@/components/schedule/appointment-form";
import { getAppointment } from "@/server/actions/schedule";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

interface EditAppointmentPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAppointmentPage({
  params,
}: EditAppointmentPageProps) {
  const { id } = await params;
  const result = await getAppointment(id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={strings.schedule.appointments.form.editTitle} />
      {!result.ok ? (
        <ErrorState message={result.error.message} />
      ) : (
        <AppointmentForm mode="edit" appointment={result.data} />
      )}
    </div>
  );
}
