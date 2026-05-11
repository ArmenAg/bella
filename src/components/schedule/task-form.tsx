"use client";

import * as React from "react";
import { canWrite } from "@/lib/auth";
import { useForm, Controller, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DestructiveConfirm } from "@/components/feedback/destructive-confirm";
import { Field } from "@/components/entries/field";

import { taskMutationSchema } from "@/server/contracts/schedule";
import {
  createTask,
  softDeleteTask,
  updateTask,
} from "@/server/actions/schedule";
import type { Task } from "@/server/contracts";

import { strings } from "@/lib/strings";
import { userFacingErrorMessage } from "@/lib/result";
import {
  toLocalDateTimeInputValue,
  fromLocalDateTimeInputValue,
} from "@/lib/format";
import { useShellProfile } from "@/components/shell/shell-context";

type TaskFormValues = z.input<typeof taskMutationSchema>;

const STATUS_ORDER: Task["status"][] = [
  "open",
  "in_progress",
  "blocked",
  "done",
  "cancelled",
];
const PRIORITY_ORDER: Task["priority"][] = ["low", "normal", "high", "urgent"];

const NONE_VALUE = "__none__";

function buildDefaults(task: Task | undefined): TaskFormValues {
  if (!task) {
    return {
      title: "",
      status: "open",
      priority: "normal",
      due_at: undefined,
      notes: undefined,
      appointment_id: undefined,
      decision_id: undefined,
      diagnosis_id: undefined,
      source_id: undefined,
    };
  }
  return {
    title: task.title,
    status: task.status,
    priority: task.priority,
    due_at: task.due_at ?? undefined,
    notes: task.notes ?? undefined,
    appointment_id: task.appointment_id ?? undefined,
    decision_id: task.decision_id ?? undefined,
    diagnosis_id: task.diagnosis_id ?? undefined,
    source_id: task.source_id ?? undefined,
  };
}

function firstZodError(errors: FieldErrors<TaskFormValues>): string | null {
  for (const key in errors) {
    const value = errors[key as keyof TaskFormValues];
    if (value && typeof value === "object" && "message" in value) {
      const message = (value as { message?: string }).message;
      if (message) return message;
    }
  }
  return null;
}

export interface LinkedOption {
  id: string;
  label: string;
}

export interface TaskFormProps {
  mode: "create" | "edit";
  task?: Task;
  appointments: LinkedOption[];
  decisions: LinkedOption[];
  diagnoses: LinkedOption[];
  sources: LinkedOption[];
}

export function TaskForm({
  mode,
  task,
  appointments,
  decisions,
  diagnoses,
  sources,
}: TaskFormProps) {
  const router = useRouter();
  const profile = useShellProfile();
  const writable = canWrite(profile?.role);

  const [submitting, setSubmitting] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskMutationSchema),
    defaultValues: buildDefaults(task),
    mode: "onTouched",
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const payload: TaskFormValues = {
        ...values,
        notes: values.notes?.trim() || undefined,
        due_at: values.due_at ?? undefined,
        appointment_id: values.appointment_id || undefined,
        decision_id: values.decision_id || undefined,
        diagnosis_id: values.diagnosis_id || undefined,
        source_id: values.source_id || undefined,
      };

      if (mode === "edit" && task) {
        const result = await updateTask({ ...payload, id: task.id });
        if (!result.ok) {
          setServerError(userFacingErrorMessage(result.error));
          return;
        }
      } else {
        const result = await createTask(payload);
        if (!result.ok) {
          setServerError(userFacingErrorMessage(result.error));
          return;
        }
      }
      router.push("/schedule?tab=tasks");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  });

  const handleDelete = async (reason: string) => {
    if (!task) return;
    setDeleting(true);
    try {
      const result = await softDeleteTask(task.id, reason);
      if (!result.ok) {
        setServerError(userFacingErrorMessage(result.error));
        return;
      }
      setConfirmDelete(false);
      router.push("/schedule?tab=tasks");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  };

  const validationSummary = firstZodError(errors);

  const renderLinkedSelect = (
    fieldName: "appointment_id" | "decision_id" | "diagnosis_id" | "source_id",
    label: string,
    options: LinkedOption[],
    fallbackOptionId: string | undefined,
  ) => {
    const allOptions =
      fallbackOptionId && !options.some((o) => o.id === fallbackOptionId)
        ? [...options, { id: fallbackOptionId, label: fallbackOptionId }]
        : options;
    return (
      <Field id={`task-${fieldName}`} label={label} optional>
        <Controller
          control={control}
          name={fieldName}
          render={({ field }) => (
            <Select
              value={field.value ?? NONE_VALUE}
              onValueChange={(next) =>
                field.onChange(next === NONE_VALUE ? undefined : next)
              }
            >
              <SelectTrigger id={`task-${fieldName}`}>
                <SelectValue
                  placeholder={strings.schedule.tasks.form.noneOption}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>
                  {strings.schedule.tasks.form.noneOption}
                </SelectItem>
                {allOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>
    );
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {serverError ? (
        <Alert variant="destructive">
          <AlertTitle>{strings.common.errorTitle}</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      {validationSummary ? (
        <Alert variant="warning">
          <AlertTitle>{strings.errors.validation}</AlertTitle>
          <AlertDescription>{validationSummary}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{strings.schedule.tasks.form.summarySection}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            id="task-title"
            label={strings.schedule.tasks.form.title}
            error={errors.title?.message}
          >
            <Input
              id="task-title"
              placeholder={strings.schedule.tasks.form.titlePlaceholder}
              aria-invalid={errors.title ? true : undefined}
              {...register("title")}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="task-status"
              label={strings.schedule.tasks.form.status}
              error={errors.status?.message}
            >
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(next) =>
                      field.onChange(next as Task["status"])
                    }
                  >
                    <SelectTrigger id="task-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_ORDER.map((status) => (
                        <SelectItem key={status} value={status}>
                          {strings.schedule.tasks.statuses[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field
              id="task-priority"
              label={strings.schedule.tasks.form.priority}
              error={errors.priority?.message}
            >
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(next) =>
                      field.onChange(next as Task["priority"])
                    }
                  >
                    <SelectTrigger id="task-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_ORDER.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {strings.schedule.tasks.priorities[priority]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <Field
            id="task-due-at"
            label={strings.schedule.tasks.form.dueAt}
            optional
            error={errors.due_at?.message}
          >
            <Controller
              control={control}
              name="due_at"
              render={({ field }) => (
                <Input
                  id="task-due-at"
                  type="datetime-local"
                  value={
                    field.value ? toLocalDateTimeInputValue(field.value) : ""
                  }
                  onChange={(event) => {
                    const next = fromLocalDateTimeInputValue(
                      event.target.value,
                    );
                    field.onChange(next);
                  }}
                />
              )}
            />
          </Field>

          <Field
            id="task-notes"
            label={strings.schedule.tasks.form.notes}
            optional
            error={errors.notes?.message}
          >
            <Textarea
              id="task-notes"
              rows={4}
              placeholder={strings.schedule.tasks.form.notesPlaceholder}
              {...register("notes")}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{strings.schedule.tasks.form.linksSection}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {renderLinkedSelect(
            "appointment_id",
            strings.schedule.tasks.form.appointment,
            appointments,
            task?.appointment_id ?? undefined,
          )}
          {renderLinkedSelect(
            "decision_id",
            strings.schedule.tasks.form.decision,
            decisions,
            task?.decision_id ?? undefined,
          )}
          {renderLinkedSelect(
            "diagnosis_id",
            strings.schedule.tasks.form.diagnosis,
            diagnoses,
            task?.diagnosis_id ?? undefined,
          )}
          {renderLinkedSelect(
            "source_id",
            strings.schedule.tasks.form.source,
            sources,
            task?.source_id ?? undefined,
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {mode === "edit" && writable ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              disabled={submitting || deleting}
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              {strings.actions.delete}
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-2 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              router.push("/schedule?tab=tasks");
              router.refresh();
            }}
            disabled={submitting}
          >
            {strings.actions.cancel}
          </Button>
          <Button type="submit" disabled={submitting || !writable}>
            {submitting ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                {strings.actions.saving}
              </>
            ) : (
              strings.actions.save
            )}
          </Button>
        </div>
      </div>

      {mode === "edit" && task ? (
        <DestructiveConfirm
          open={confirmDelete}
          onOpenChange={(next) => {
            if (!deleting) setConfirmDelete(next);
          }}
          title={strings.schedule.tasks.form.deleteTitle}
          requireReason
          confirming={deleting}
          onConfirm={(reason) => {
            void handleDelete(reason);
          }}
        />
      ) : null}
    </form>
  );
}
