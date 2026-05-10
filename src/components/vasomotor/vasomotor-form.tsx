"use client";

import * as React from "react";
import { Controller, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DestructiveConfirm } from "@/components/feedback/destructive-confirm";
import { Field } from "@/components/entries/field";
import { ToggleChip } from "@/components/entries/toggle-chip";
import {
  AttachmentUploader,
  type AttachmentUploaderProps,
} from "@/components/upload/attachment-uploader";
import type { AttachmentUploaderHandle } from "@/components/upload/types";

import { vasomotorMeasurementMutationSchema } from "@/server/contracts/vasomotor";
import {
  createVasomotorMeasurement,
  softDeleteVasomotorMeasurement,
  updateVasomotorMeasurement,
} from "@/server/actions/vasomotor";
import type {
  CreateVasomotorMeasurementInput,
  UpdateVasomotorMeasurementInput,
  VasomotorMeasurementDTO,
} from "@/server/contracts";

import {
  fromLocalDateTimeInputValue,
  toLocalDateTimeInputValue,
} from "@/lib/format";
import { strings } from "@/lib/strings";
import { userFacingErrorMessage } from "@/lib/result";
import { cn } from "@/lib/utils";

// We resolve against a partial of the mutation schema so the UI can collect
// values progressively (datetime can be empty mid-edit, photos optional). The
// server action enforces the strict schema on submit.
const vasomotorFormSchema = vasomotorMeasurementMutationSchema.partial();
type VasomotorFormValues = z.input<typeof vasomotorFormSchema>;

const CONTEXT_ORDER = [
  "baseline",
  "active_flare",
  "recovery",
  "after_pressure_trigger",
  "after_medication",
  "after_procedure",
  "custom",
] as const;

type VasomotorContext = (typeof CONTEXT_ORDER)[number];

export interface VasomotorFormProps {
  mode: "create" | "edit";
  measurement?: VasomotorMeasurementDTO;
  /** When provided and "Link to active flare" is checked, sets entry_id. */
  activeFlareEntryId?: string | null;
  /**
   * Pre-fill the context (e.g. "active_flare" when launched from Flare Mode).
   */
  defaultContext?: VasomotorContext;
  /** When true, the link-to-active-flare checkbox is pre-checked. */
  defaultLinkToFlare?: boolean;
  /** Called after a successful save (create or edit). */
  onSaved?: (measurement: VasomotorMeasurementDTO) => void;
  /** Called when the user cancels. */
  onCancel?: () => void;
  /** Hide the cancel button (e.g. when embedded in a sheet that has its own close). */
  hideCancel?: boolean;
  /** Hide the destructive remove button (only meaningful in edit mode). */
  hideDelete?: boolean;
  /** When set, redirect on success to this href instead of calling onSaved. */
  redirectOnSuccess?: string;
  className?: string;
}

function nowIsoForInput(): string {
  return toLocalDateTimeInputValue(new Date().toISOString());
}

function buildDefaults(props: VasomotorFormProps): VasomotorFormValues {
  if (props.measurement) {
    const m = props.measurement;
    return {
      entry_id: m.entry_id ?? undefined,
      measured_at: m.measured_at,
      site: m.site,
      left_temp_c: m.left_temp_c ?? undefined,
      right_temp_c: m.right_temp_c ?? undefined,
      left_color: m.left_color ?? undefined,
      right_color: m.right_color ?? undefined,
      lighting_notes: m.lighting_notes ?? undefined,
      context: m.context,
      notes: m.notes ?? undefined,
      left_attachment_id: m.left_attachment_id ?? undefined,
      right_attachment_id: m.right_attachment_id ?? undefined,
    };
  }

  return {
    entry_id:
      props.defaultLinkToFlare && props.activeFlareEntryId
        ? props.activeFlareEntryId
        : undefined,
    measured_at: new Date().toISOString(),
    site: "",
    left_temp_c: undefined,
    right_temp_c: undefined,
    left_color: undefined,
    right_color: undefined,
    lighting_notes: undefined,
    context: props.defaultContext ?? "baseline",
    notes: undefined,
    left_attachment_id: undefined,
    right_attachment_id: undefined,
  };
}

function firstZodError(
  errors: FieldErrors<VasomotorFormValues>,
): string | null {
  for (const key in errors) {
    const value = errors[key as keyof VasomotorFormValues];
    if (value && typeof value === "object" && "message" in value) {
      const message = (value as { message?: string }).message;
      if (message) return message;
    }
  }
  return null;
}

function formatDelta(left: number | undefined, right: number | undefined) {
  if (left == null || right == null) return null;
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
  const delta = right - left;
  return Math.round(delta * 100) / 100;
}

export function VasomotorForm(props: VasomotorFormProps) {
  const {
    mode,
    measurement,
    activeFlareEntryId,
    defaultContext,
    onSaved,
    onCancel,
    hideCancel,
    hideDelete,
    redirectOnSuccess,
    className,
  } = props;
  const router = useRouter();

  const leftUploaderRef = React.useRef<AttachmentUploaderHandle>(null);
  const rightUploaderRef = React.useRef<AttachmentUploaderHandle>(null);

  const [leftPending, setLeftPending] = React.useState(false);
  const [rightPending, setRightPending] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const formStrings = strings.vasomotor.form;
  const contextLabels = strings.vasomotor.contexts;

  const form = useForm<VasomotorFormValues>({
    resolver: zodResolver(vasomotorFormSchema),
    defaultValues: buildDefaults(props),
    mode: "onTouched",
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const watchedLeftTemp = watch("left_temp_c");
  const watchedRightTemp = watch("right_temp_c");
  const watchedEntryId = watch("entry_id");
  const linkToFlareChecked = watchedEntryId === activeFlareEntryId;

  const computedDelta = React.useMemo(
    () =>
      formatDelta(
        typeof watchedLeftTemp === "number" ? watchedLeftTemp : undefined,
        typeof watchedRightTemp === "number" ? watchedRightTemp : undefined,
      ),
    [watchedLeftTemp, watchedRightTemp],
  );

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);

    if (
      leftUploaderRef.current?.hasPendingUploads() ||
      rightUploaderRef.current?.hasPendingUploads()
    ) {
      setServerError(formStrings.pendingUploads);
      return;
    }

    if (!values.site || values.site.trim().length === 0) {
      setServerError(formStrings.missingSite);
      return;
    }

    setSubmitting(true);
    try {
      const leftIds = leftUploaderRef.current?.getReadyAttachmentIds() ?? [];
      const rightIds = rightUploaderRef.current?.getReadyAttachmentIds() ?? [];
      const left_attachment_id = leftIds[0] ?? values.left_attachment_id;
      const right_attachment_id = rightIds[0] ?? values.right_attachment_id;

      if (mode === "edit" && measurement) {
        const payload: UpdateVasomotorMeasurementInput = {
          id: measurement.id,
          measured_at: values.measured_at,
          site: values.site,
          left_temp_c: values.left_temp_c,
          right_temp_c: values.right_temp_c,
          left_color: values.left_color,
          right_color: values.right_color,
          lighting_notes: values.lighting_notes,
          context: values.context,
          notes: values.notes,
          entry_id: values.entry_id,
          left_attachment_id,
          right_attachment_id,
        };
        const result = await updateVasomotorMeasurement(payload);
        if (!result.ok) {
          setServerError(userFacingErrorMessage(result.error));
          return;
        }
        if (redirectOnSuccess) {
          router.push(redirectOnSuccess);
          router.refresh();
        } else {
          onSaved?.(result.data);
          router.refresh();
        }
      } else {
        const payload: CreateVasomotorMeasurementInput = {
          measured_at: values.measured_at ?? new Date().toISOString(),
          site: values.site ?? "",
          left_temp_c: values.left_temp_c,
          right_temp_c: values.right_temp_c,
          left_color: values.left_color,
          right_color: values.right_color,
          lighting_notes: values.lighting_notes,
          context: values.context ?? "baseline",
          notes: values.notes,
          entry_id: values.entry_id,
          left_attachment_id,
          right_attachment_id,
        };
        const result = await createVasomotorMeasurement(payload);
        if (!result.ok) {
          setServerError(userFacingErrorMessage(result.error));
          return;
        }
        if (redirectOnSuccess) {
          router.push(redirectOnSuccess);
          router.refresh();
        } else {
          onSaved?.(result.data);
          router.refresh();
        }
      }
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : strings.errors.generic,
      );
    } finally {
      setSubmitting(false);
    }
  });

  const handleDelete = async (reason: string) => {
    if (!measurement) return;
    setDeleting(true);
    try {
      const result = await softDeleteVasomotorMeasurement(
        measurement.id,
        reason,
      );
      if (!result.ok) {
        setServerError(userFacingErrorMessage(result.error));
        return;
      }
      setConfirmDelete(false);
      if (redirectOnSuccess) {
        router.push(redirectOnSuccess);
      }
      router.refresh();
    } finally {
      setDeleting(false);
    }
  };

  const validationSummary = firstZodError(errors);
  const pendingUploads = leftPending || rightPending;

  const siteSuggestions: readonly string[] = formStrings.siteSuggestions;

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className={cn("flex flex-col gap-5", className)}
    >
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
          <CardTitle>{formStrings.site}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            id="vasomotor-site"
            label={formStrings.site}
            error={errors.site?.message}
          >
            <Input
              id="vasomotor-site"
              placeholder={formStrings.sitePlaceholder}
              aria-invalid={errors.site ? true : undefined}
              {...register("site")}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {siteSuggestions.map((suggestion) => (
                <ToggleChip
                  key={suggestion}
                  active={watch("site") === suggestion}
                  onToggle={() =>
                    setValue("site", suggestion, { shouldDirty: true })
                  }
                >
                  {suggestion}
                </ToggleChip>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="vasomotor-context"
              label={formStrings.context}
              error={errors.context?.message}
            >
              <Controller
                control={control}
                name="context"
                render={({ field }) => (
                  <Select
                    value={field.value ?? defaultContext ?? "baseline"}
                    onValueChange={(next) =>
                      field.onChange(next as VasomotorContext)
                    }
                  >
                    <SelectTrigger
                      id="vasomotor-context"
                      aria-invalid={errors.context ? true : undefined}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTEXT_ORDER.map((value) => (
                        <SelectItem key={value} value={value}>
                          {contextLabels[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field
              id="vasomotor-measured-at"
              label={formStrings.measuredAt}
              error={errors.measured_at?.message}
            >
              <Controller
                control={control}
                name="measured_at"
                render={({ field }) => (
                  <Input
                    id="vasomotor-measured-at"
                    type="datetime-local"
                    value={
                      field.value
                        ? toLocalDateTimeInputValue(field.value)
                        : nowIsoForInput()
                    }
                    onChange={(event) => {
                      const next = fromLocalDateTimeInputValue(
                        event.target.value,
                      );
                      if (next) field.onChange(next);
                    }}
                    aria-invalid={errors.measured_at ? true : undefined}
                  />
                )}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {formStrings.leftPhoto} · {formStrings.rightPhoto}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            {formStrings.missingPhotosNote}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">{formStrings.leftPhoto}</p>
              <p className="text-xs text-muted-foreground">
                {formStrings.photoLeftHint}
              </p>
              <UploaderShell
                uploaderRef={leftUploaderRef}
                disabled={submitting || deleting}
                onPendingChange={setLeftPending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">{formStrings.rightPhoto}</p>
              <p className="text-xs text-muted-foreground">
                {formStrings.photoRightHint}
              </p>
              <UploaderShell
                uploaderRef={rightUploaderRef}
                disabled={submitting || deleting}
                onPendingChange={setRightPending}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {formStrings.leftTemp} · {formStrings.rightTemp}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="vasomotor-left-temp"
              label={formStrings.leftTemp}
              optional
              error={errors.left_temp_c?.message}
            >
              <Controller
                control={control}
                name="left_temp_c"
                render={({ field }) => (
                  <Input
                    id="vasomotor-left-temp"
                    type="number"
                    inputMode="decimal"
                    step={formStrings.tempStep}
                    placeholder={formStrings.leftTempPlaceholder}
                    value={field.value ?? ""}
                    onChange={(event) => {
                      const raw = event.target.value;
                      if (raw === "") {
                        field.onChange(undefined);
                        return;
                      }
                      const parsed = Number(raw);
                      field.onChange(
                        Number.isFinite(parsed) ? parsed : undefined,
                      );
                    }}
                  />
                )}
              />
            </Field>
            <Field
              id="vasomotor-right-temp"
              label={formStrings.rightTemp}
              optional
              error={errors.right_temp_c?.message}
            >
              <Controller
                control={control}
                name="right_temp_c"
                render={({ field }) => (
                  <Input
                    id="vasomotor-right-temp"
                    type="number"
                    inputMode="decimal"
                    step={formStrings.tempStep}
                    placeholder={formStrings.rightTempPlaceholder}
                    value={field.value ?? ""}
                    onChange={(event) => {
                      const raw = event.target.value;
                      if (raw === "") {
                        field.onChange(undefined);
                        return;
                      }
                      const parsed = Number(raw);
                      field.onChange(
                        Number.isFinite(parsed) ? parsed : undefined,
                      );
                    }}
                  />
                )}
              />
            </Field>
          </div>

          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {formStrings.deltaComputed}
            </p>
            <p className="mt-0.5 font-mono text-base">
              {computedDelta == null
                ? formStrings.deltaPending
                : `Δ ${computedDelta > 0 ? "+" : ""}${computedDelta.toFixed(2)} °C`}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="vasomotor-left-color"
              label={formStrings.leftColor}
              optional
            >
              <Input
                id="vasomotor-left-color"
                placeholder={formStrings.leftColorPlaceholder}
                {...register("left_color")}
              />
            </Field>
            <Field
              id="vasomotor-right-color"
              label={formStrings.rightColor}
              optional
            >
              <Input
                id="vasomotor-right-color"
                placeholder={formStrings.rightColorPlaceholder}
                {...register("right_color")}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{formStrings.notes}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            id="vasomotor-lighting-notes"
            label={formStrings.lightingNotes}
            optional
          >
            <Input
              id="vasomotor-lighting-notes"
              placeholder={formStrings.lightingPlaceholder}
              {...register("lighting_notes")}
            />
          </Field>
          <Field id="vasomotor-notes" label={formStrings.notes} optional>
            <Textarea
              id="vasomotor-notes"
              rows={4}
              placeholder={formStrings.notesPlaceholder}
              {...register("notes")}
            />
          </Field>
          {activeFlareEntryId ? (
            <label className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
              <Checkbox
                checked={linkToFlareChecked}
                onCheckedChange={(checked) => {
                  if (checked === true) {
                    setValue("entry_id", activeFlareEntryId, {
                      shouldDirty: true,
                    });
                  } else {
                    setValue("entry_id", undefined, { shouldDirty: true });
                  }
                }}
              />
              <span className="flex-1">
                {formStrings.linkEntry}
                <span className="block text-xs text-muted-foreground">
                  {formStrings.linkEntryHelp}
                </span>
              </span>
            </label>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {mode === "edit" && !hideDelete ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              disabled={submitting || deleting}
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              {formStrings.delete}
            </Button>
          ) : null}
          {pendingUploads ? (
            <span className="text-xs text-muted-foreground">
              {formStrings.pendingUploads}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 sm:justify-end">
          {hideCancel ? null : (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onCancel?.()}
              disabled={submitting}
            >
              {strings.actions.cancel}
            </Button>
          )}
          <Button type="submit" disabled={submitting || pendingUploads}>
            {submitting ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                {formStrings.submitting}
              </>
            ) : (
              formStrings.submit
            )}
          </Button>
        </div>
      </div>

      {mode === "edit" && measurement && !hideDelete ? (
        <DestructiveConfirm
          open={confirmDelete}
          onOpenChange={(next) => {
            if (!deleting) setConfirmDelete(next);
          }}
          title={formStrings.deleteTitle}
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

interface UploaderShellProps {
  uploaderRef: React.RefObject<AttachmentUploaderHandle | null>;
  disabled?: boolean;
  onPendingChange: (pending: boolean) => void;
}

function UploaderShell({
  uploaderRef,
  disabled,
  onPendingChange,
}: UploaderShellProps) {
  const props: AttachmentUploaderProps = {
    initialAttachments: [],
    disabled,
    onReadyChange: () => {
      onPendingChange(uploaderRef.current?.hasPendingUploads() ?? false);
    },
  };
  return <AttachmentUploader ref={uploaderRef} {...props} />;
}
