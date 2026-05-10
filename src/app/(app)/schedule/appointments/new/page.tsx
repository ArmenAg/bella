import { PageHeader } from "@/components/shell/page-header";
import { AppointmentForm } from "@/components/schedule/appointment-form";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

export default function NewAppointmentPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={strings.schedule.appointments.form.newTitle} />
      <AppointmentForm mode="create" />
    </div>
  );
}
