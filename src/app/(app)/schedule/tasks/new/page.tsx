import { PageHeader } from "@/components/shell/page-header";
import { TaskForm } from "@/components/schedule/task-form";
import { loadTaskFormOptions } from "@/components/schedule/load-task-options";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const options = await loadTaskFormOptions();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={strings.schedule.tasks.form.newTitle} />
      <TaskForm
        mode="create"
        appointments={options.appointments}
        decisions={options.decisions}
        diagnoses={options.diagnoses}
        sources={options.sources}
      />
    </div>
  );
}
