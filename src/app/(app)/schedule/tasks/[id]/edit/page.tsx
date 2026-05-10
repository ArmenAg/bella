import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import { TaskForm } from "@/components/schedule/task-form";
import { loadTaskFormOptions } from "@/components/schedule/load-task-options";
import { getTask } from "@/server/actions/schedule";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

interface EditTaskPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTaskPage({ params }: EditTaskPageProps) {
  const { id } = await params;
  const [taskResult, options] = await Promise.all([
    getTask(id),
    loadTaskFormOptions(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={strings.schedule.tasks.form.editTitle} />
      {!taskResult.ok ? (
        <ErrorState message={taskResult.error.message} />
      ) : (
        <TaskForm
          mode="edit"
          task={taskResult.data}
          appointments={options.appointments}
          decisions={options.decisions}
          diagnoses={options.diagnoses}
          sources={options.sources}
        />
      )}
    </div>
  );
}
