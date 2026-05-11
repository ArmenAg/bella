"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DestructiveConfirm } from "@/components/feedback/destructive-confirm";
import {
  AttachmentUploader,
  type AttachmentUploaderProps,
} from "@/components/upload/attachment-uploader";
import type { AttachmentUploaderHandle } from "@/components/upload/types";
import { linkAttachments } from "@/components/upload/link-attachments";

import { entryBaseMutationSchema } from "@/server/contracts/entries";
import {
  createEntry,
  softDeleteEntry,
  updateEntry,
} from "@/server/actions/entries";
import type {
  BodyRegionDTO,
  CreateEntryInput,
  EntryDTO,
  EntryType,
  SymptomDTO,
  TriggerDTO,
} from "@/server/contracts";

import { strings } from "@/lib/strings";
import {
  formatDateTime,
  fromLocalDateTimeInputValue,
  nowIso,
  nowIsoForInput,
  toLocalDateTimeInputValue,
} from "@/lib/format";
import { firstZodError } from "@/lib/forms";
import { cn } from "@/lib/utils";

import { ToggleChip } from "./toggle-chip";
import { PainSegmented } from "./pain-segmented";
import { ChipInput } from "./chip-input";
import { Field } from "./field";
import { CollapsibleSection } from "./collapsible-section";

type EntryFormValues = z.input<typeof entryBaseMutationSchema>;

export type EntryFormVariant = "pain" | "log";

export interface EntryFormProps {
  variant: EntryFormVariant;
  mode: "create" | "edit";
  entry?: EntryDTO;
  bodyRegions: BodyRegionDTO[];
  symptoms: SymptomDTO[];
  triggers: TriggerDTO[];
  quick?: boolean;
}

const PAIN_TYPE_ORDER: EntryType[] = [
  "baseline",
  "flare",
  "recovery",
  "procedure_related",
  "medication_related",
];

function buildDefaults(
  variant: EntryFormVariant,
  entry: EntryDTO | undefined,
  captureOpenedAt: string,
): EntryFormValues {
  if (entry) {
    return {
      type: entry.type,
      occurred_at: entry.occurred_at,
      ended_at: entry.ended_at ?? undefined,
      title: entry.title,
      pain_current: entry.pain_current ?? undefined,
      pain_peak: entry.pain_peak ?? undefined,
      pain_average: entry.pain_average ?? undefined,
      primary_trigger_id: entry.primary_trigger_id ?? undefined,
      notes: entry.notes ?? undefined,
      function_impact: entry.function_impact ?? [],
      interventions_tried: entry.interventions_tried ?? [],
      response: entry.response ?? undefined,
      is_flare: entry.is_flare,
      flare_status: entry.flare_status ?? undefined,
      recovery_minutes: entry.recovery_minutes ?? undefined,
      client_recorded_at: entry.client_recorded_at ?? undefined,
      body_region_ids: entry.body_region_ids ?? [],
      symptoms: (entry.symptom_ids ?? []).map((symptom_id) => ({
        symptom_id,
      })),
      triggers: (entry.trigger_ids ?? []).map((trigger_id) => ({
        trigger_id,
      })),
    };
  }

  const isPain = variant === "pain";
  return {
    type: isPain ? "baseline" : "freeform",
    occurred_at: captureOpenedAt,
    ended_at: undefined,
    title: "",
    pain_current: undefined,
    pain_peak: undefined,
    pain_average: undefined,
    primary_trigger_id: undefined,
    notes: undefined,
    function_impact: [],
    interventions_tried: [],
    response: undefined,
    is_flare: false,
    flare_status: undefined,
    recovery_minutes: undefined,
    client_recorded_at: captureOpenedAt,
    body_region_ids: [],
    symptoms: [],
    triggers: [],
  };
}

export function EntryForm(props: EntryFormProps) {
  const {
    variant,
    mode,
    entry,
    bodyRegions,
    symptoms,
    triggers,
    quick = false,
  } = props;
  const router = useRouter();
  const isPain = variant === "pain";
  const isQuickCreate = quick && mode === "create";
  const isQuickPainCreate = isQuickCreate && isPain;
  const isQuickLogCreate = isQuickCreate && !isPain;

  const listHref = isPain ? "/pain-book" : "/log-book";
  const formStrings = isPain ? strings.painBook.form : strings.logBook.form;

  const captureOpenedAtRef = React.useRef<string | null>(null);
  if (captureOpenedAtRef.current === null) {
    captureOpenedAtRef.current = new Date().toISOString();
  }

  const uploaderRef = React.useRef<AttachmentUploaderHandle>(null);
  const [pendingUploads, setPendingUploads] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entryBaseMutationSchema),
    defaultValues: buildDefaults(variant, entry, captureOpenedAtRef.current),
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

  const watchedType = watch("type");
  const watchedIsFlare = watch("is_flare");

  // When type changes to/from "flare", auto-set is_flare to satisfy the
  // create-time refinement in createEntryInputSchema.
  React.useEffect(() => {
    if (watchedType === "flare" && !watchedIsFlare) {
      setValue("is_flare", true, { shouldDirty: true });
    }
  }, [watchedType, watchedIsFlare, setValue]);

  const bellaTriggers = React.useMemo(
    () =>
      triggers
        .filter((trigger) => trigger.is_bella_specific)
        .sort((a, b) => a.display_order - b.display_order),
    [triggers],
  );
  const otherTriggers = React.useMemo(
    () =>
      triggers
        .filter((trigger) => !trigger.is_bella_specific)
        .sort((a, b) => a.display_order - b.display_order),
    [triggers],
  );
  const orderedRegions = React.useMemo(
    () => [...bodyRegions].sort((a, b) => a.display_order - b.display_order),
    [bodyRegions],
  );
  const orderedSymptoms = React.useMemo(
    () => [...symptoms].sort((a, b) => a.display_order - b.display_order),
    [symptoms],
  );

  // Disclosure defaults: collapsed in create mode; in edit mode, expand a
  // section if it carries any existing data so saved values are never hidden.
  // Attachments isn't surfaced on EntryDTO yet, so it opens unconditionally
  // in edit mode — see the attachmentsEditNote rendered below.
  const isEdit = mode === "edit";
  const painExtrasOpen =
    isEdit &&
    Boolean(
      entry &&
      (entry.pain_peak != null ||
        entry.pain_average != null ||
        entry.recovery_minutes != null),
    );
  const contextOpen =
    isEdit &&
    Boolean(
      entry &&
      ((entry.body_region_ids?.length ?? 0) > 0 ||
        (entry.symptom_ids?.length ?? 0) > 0 ||
        (entry.trigger_ids?.length ?? 0) > 0),
    );
  const responseOpen =
    isEdit &&
    Boolean(
      entry &&
      ((entry.function_impact?.length ?? 0) > 0 ||
        (entry.interventions_tried?.length ?? 0) > 0 ||
        (entry.response && entry.response.trim() !== "")),
    );
  const notesOpen =
    isEdit && Boolean(entry?.notes && entry.notes.trim() !== "");
  const attachmentsOpen = isEdit;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);

    if (uploaderRef.current?.hasPendingUploads()) {
      setServerError(formStrings.pendingUploads);
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateEntryInput = {
        ...values,
        type: isPain ? values.type : "freeform",
        is_flare: isPain ? values.is_flare : false,
        flare_status: values.is_flare ? values.flare_status : undefined,
      };

      if (mode === "edit" && entry) {
        const result = await updateEntry({
          ...payload,
          id: entry.id,
        });
        if (!result.ok) {
          setServerError(result.error.message);
          return;
        }
      } else {
        const result = await createEntry(payload);
        if (!result.ok) {
          setServerError(result.error.message);
          return;
        }
        const newId = result.data.id;
        const readyIds = uploaderRef.current?.getReadyAttachmentIds() ?? [];
        if (readyIds.length > 0) {
          await linkAttachments({
            attachmentIds: readyIds,
            linkedType: "entry",
            linkedId: newId,
          });
        }
      }

      router.push(listHref);
      router.refresh();
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : strings.errors.generic,
      );
    } finally {
      setSubmitting(false);
    }
  });

  // Pre-validation hook: when creating an entry with a blank title, fill it in
  // with a sensible default so the zod `min(1)` rule on `title` doesn't block
  // submission. Runs synchronously before react-hook-form's handleSubmit kicks
  // off validation.
  const handleFormSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    if (mode === "create") {
      const currentTitle = form.getValues("title");
      if (!currentTitle || currentTitle.trim() === "") {
        const currentType = form.getValues("type");
        const effectiveType: EntryType = isPain ? currentType : "freeform";
        const typeLabel =
          strings.painBook.types[effectiveType] ?? effectiveType;
        const occurredIso = form.getValues("occurred_at") ?? nowIso();
        form.setValue(
          "title",
          `${typeLabel} · ${formatDateTime(occurredIso)}`,
          { shouldValidate: false, shouldDirty: true },
        );
      }
    }
    return onSubmit(event);
  };

  const handleDelete = async (reason: string) => {
    if (!entry) return;
    setDeleting(true);
    try {
      const result = await softDeleteEntry(entry.id, reason);
      if (!result.ok) {
        setServerError(result.error.message);
        return;
      }
      setConfirmDelete(false);
      router.push(listHref);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  };

  const validationSummary = firstZodError(errors);

  const renderPainCurrentField = () => (
    <Field
      id="entry-pain-current"
      label={strings.painBook.form.painCurrent}
      optional
      error={errors.pain_current?.message}
    >
      <Controller
        control={control}
        name="pain_current"
        render={({ field }) => (
          <PainSegmented
            id="entry-pain-current"
            value={field.value ?? undefined}
            onChange={(next) => field.onChange(next)}
            ariaLabel={strings.painBook.form.painCurrent}
          />
        )}
      />
    </Field>
  );

  const renderNotesField = (rows = 6) => (
    <Field
      id="entry-notes"
      label={isPain ? strings.painBook.form.notes : strings.logBook.form.notes}
      optional
      error={errors.notes?.message}
    >
      <Label htmlFor="entry-notes" className="sr-only">
        {isPain ? strings.painBook.form.notes : strings.logBook.form.notes}
      </Label>
      <Textarea
        id="entry-notes"
        rows={rows}
        placeholder={
          isPain
            ? strings.painBook.form.notesPlaceholder
            : strings.logBook.form.notesPlaceholder
        }
        maxLength={20000}
        aria-invalid={errors.notes ? true : undefined}
        {...register("notes")}
      />
    </Field>
  );

  return (
    <form
      onSubmit={handleFormSubmit}
      noValidate
      className="flex flex-col gap-5 mb-16 lg:mb-0"
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
          <CardTitle>{formStrings.summarySection}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isQuickPainCreate ? renderPainCurrentField() : null}
          {isQuickLogCreate ? renderNotesField(4) : null}

          <Field
            id="entry-title"
            label={formStrings.title}
            optional={mode === "create"}
            error={errors.title?.message}
          >
            <Input
              id="entry-title"
              placeholder={
                mode === "create"
                  ? formStrings.titleAutoPlaceholder
                  : formStrings.titlePlaceholder
              }
              aria-invalid={errors.title ? true : undefined}
              {...register("title")}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="entry-occurred-at"
              label={formStrings.occurredAt}
              error={errors.occurred_at?.message}
            >
              <Controller
                control={control}
                name="occurred_at"
                render={({ field }) => (
                  <Input
                    id="entry-occurred-at"
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
                    aria-invalid={errors.occurred_at ? true : undefined}
                  />
                )}
              />
            </Field>
            <Field
              id="entry-ended-at"
              label={formStrings.endedAt}
              optional
              error={errors.ended_at?.message}
            >
              <Controller
                control={control}
                name="ended_at"
                render={({ field }) => (
                  <Input
                    id="entry-ended-at"
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
                    aria-invalid={errors.ended_at ? true : undefined}
                  />
                )}
              />
            </Field>
          </div>

          {isPain ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                id="entry-type"
                label={strings.painBook.form.type}
                error={errors.type?.message}
              >
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(next) =>
                        field.onChange(next as EntryType)
                      }
                    >
                      <SelectTrigger
                        id="entry-type"
                        aria-invalid={errors.type ? true : undefined}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAIN_TYPE_ORDER.map((typeKey) => (
                          <SelectItem key={typeKey} value={typeKey}>
                            {strings.painBook.types[typeKey]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <div className="flex flex-col justify-end gap-2">
                <label className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
                  <Controller
                    control={control}
                    name="is_flare"
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                      />
                    )}
                  />
                  <span>{strings.painBook.form.isFlare}</span>
                </label>
                {watchedIsFlare ? (
                  <Field
                    id="entry-flare-status"
                    label={strings.painBook.form.flareStatus}
                    optional
                    error={errors.flare_status?.message}
                  >
                    <Controller
                      control={control}
                      name="flare_status"
                      render={({ field }) => (
                        <Select
                          value={field.value ?? undefined}
                          onValueChange={(next) =>
                            field.onChange(
                              next as EntryFormValues["flare_status"],
                            )
                          }
                        >
                          <SelectTrigger id="entry-flare-status">
                            <SelectValue
                              placeholder={strings.common.selectOne}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">
                              {strings.painBook.form.flareStatusActive}
                            </SelectItem>
                            <SelectItem value="ended">
                              {strings.painBook.form.flareStatusEnded}
                            </SelectItem>
                            <SelectItem value="cancelled">
                              {strings.painBook.form.flareStatusCancelled}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {isPain ? (
        <Card>
          <CardHeader>
            <CardTitle>{strings.painBook.form.painSection}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {isQuickPainCreate ? null : renderPainCurrentField()}
            <CollapsibleSection
              title={strings.painBook.form.disclosure.painExtras}
              hint={strings.painBook.form.disclosure.painExtrasHint}
              defaultOpen={painExtrasOpen}
            >
              <Field
                id="entry-pain-peak"
                label={strings.painBook.form.painPeak}
                optional
                error={errors.pain_peak?.message}
              >
                <Controller
                  control={control}
                  name="pain_peak"
                  render={({ field }) => (
                    <PainSegmented
                      id="entry-pain-peak"
                      value={field.value ?? undefined}
                      onChange={(next) => field.onChange(next)}
                      ariaLabel={strings.painBook.form.painPeak}
                    />
                  )}
                />
              </Field>
              <Field
                id="entry-pain-average"
                label={strings.painBook.form.painAverage}
                optional
                error={errors.pain_average?.message}
              >
                <Controller
                  control={control}
                  name="pain_average"
                  render={({ field }) => (
                    <PainSegmented
                      id="entry-pain-average"
                      value={field.value ?? undefined}
                      onChange={(next) => field.onChange(next)}
                      ariaLabel={strings.painBook.form.painAverage}
                    />
                  )}
                />
              </Field>
              <Field
                id="entry-recovery-minutes"
                label={strings.painBook.form.recoveryMinutes}
                optional
                error={errors.recovery_minutes?.message}
              >
                <Controller
                  control={control}
                  name="recovery_minutes"
                  render={({ field }) => (
                    <Input
                      id="entry-recovery-minutes"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder={
                        strings.painBook.form.recoveryMinutesPlaceholder
                      }
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
            </CollapsibleSection>
          </CardContent>
        </Card>
      ) : null}

      <CollapsibleSection
        title={
          isPain
            ? strings.painBook.form.disclosure.context
            : strings.logBook.form.disclosure.context
        }
        hint={
          isPain
            ? strings.painBook.form.disclosure.contextHint
            : strings.logBook.form.disclosure.contextHint
        }
        defaultOpen={contextOpen}
      >
        <Field
          label={
            isPain
              ? strings.painBook.form.bodyRegions
              : strings.logBook.form.bodyRegions
          }
          optional
        >
          <Controller
            control={control}
            name="body_region_ids"
            render={({ field }) => {
              const selected = new Set(field.value ?? []);
              if (orderedRegions.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground">
                    {formStrings.noBodyRegions}
                  </p>
                );
              }
              return (
                <div className="flex flex-wrap gap-1.5">
                  {orderedRegions.map((region) => {
                    const active = selected.has(region.id);
                    return (
                      <ToggleChip
                        key={region.id}
                        active={active}
                        onToggle={() => {
                          const next = new Set(selected);
                          if (active) next.delete(region.id);
                          else next.add(region.id);
                          field.onChange(Array.from(next));
                        }}
                      >
                        {region.name}
                      </ToggleChip>
                    );
                  })}
                </div>
              );
            }}
          />
        </Field>

        <Field
          label={
            isPain
              ? strings.painBook.form.qualities
              : strings.logBook.form.symptoms
          }
          optional
        >
          <Controller
            control={control}
            name="symptoms"
            render={({ field }) => {
              const selected = new Set(
                (field.value ?? []).map((entry) => entry.symptom_id),
              );
              if (orderedSymptoms.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground">
                    {formStrings.noSymptoms}
                  </p>
                );
              }
              return (
                <div className="flex flex-wrap gap-1.5">
                  {orderedSymptoms.map((symptom) => {
                    const active = selected.has(symptom.id);
                    return (
                      <ToggleChip
                        key={symptom.id}
                        active={active}
                        onToggle={() => {
                          const current = field.value ?? [];
                          const next = active
                            ? current.filter(
                                (item) => item.symptom_id !== symptom.id,
                              )
                            : [...current, { symptom_id: symptom.id }];
                          field.onChange(next);
                        }}
                      >
                        {symptom.name}
                      </ToggleChip>
                    );
                  })}
                </div>
              );
            }}
          />
        </Field>

        <Field label={strings.painBook.form.triggers} optional>
          <Controller
            control={control}
            name="triggers"
            render={({ field }) => {
              const selected = new Set(
                (field.value ?? []).map((entry) => entry.trigger_id),
              );
              const toggle = (id: string) => {
                const current = field.value ?? [];
                const isActive = selected.has(id);
                const next = isActive
                  ? current.filter((item) => item.trigger_id !== id)
                  : [...current, { trigger_id: id }];
                field.onChange(next);
              };
              if (bellaTriggers.length === 0 && otherTriggers.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground">
                    {formStrings.noTriggers}
                  </p>
                );
              }
              return (
                <div className="flex flex-col gap-3">
                  {bellaTriggers.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {strings.painBook.form.bellaTriggers}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {bellaTriggers.map((trigger) => (
                          <ToggleChip
                            key={trigger.id}
                            active={selected.has(trigger.id)}
                            onToggle={() => toggle(trigger.id)}
                          >
                            {trigger.name}
                          </ToggleChip>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {otherTriggers.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {strings.painBook.form.generalTriggers}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {otherTriggers.map((trigger) => (
                          <ToggleChip
                            key={trigger.id}
                            active={selected.has(trigger.id)}
                            onToggle={() => toggle(trigger.id)}
                          >
                            {trigger.name}
                          </ToggleChip>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            }}
          />
        </Field>
      </CollapsibleSection>

      {isPain ? (
        <CollapsibleSection
          title={strings.painBook.form.disclosure.response}
          hint={strings.painBook.form.disclosure.responseHint}
          defaultOpen={responseOpen}
        >
          <Field
            id="entry-function-impact"
            label={strings.painBook.form.functionImpact}
            optional
          >
            <Controller
              control={control}
              name="function_impact"
              render={({ field }) => (
                <ChipInput
                  id="entry-function-impact"
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder={strings.painBook.form.functionImpactPlaceholder}
                  ariaLabel={strings.painBook.form.functionImpact}
                />
              )}
            />
          </Field>

          <Field
            id="entry-interventions"
            label={strings.painBook.form.interventionsTried}
            optional
          >
            <Controller
              control={control}
              name="interventions_tried"
              render={({ field }) => (
                <ChipInput
                  id="entry-interventions"
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder={
                    strings.painBook.form.interventionsTriedPlaceholder
                  }
                  ariaLabel={strings.painBook.form.interventionsTried}
                />
              )}
            />
          </Field>

          <Field
            id="entry-response"
            label={strings.painBook.form.response}
            optional
            error={errors.response?.message}
          >
            <Textarea
              id="entry-response"
              rows={3}
              placeholder={strings.painBook.form.responsePlaceholder}
              {...register("response")}
            />
          </Field>
        </CollapsibleSection>
      ) : null}

      {isQuickLogCreate ? null : (
        <CollapsibleSection
          title={
            isPain
              ? strings.painBook.form.disclosure.notes
              : strings.logBook.form.disclosure.notes
          }
          hint={
            isPain
              ? strings.painBook.form.disclosure.notesHint
              : strings.logBook.form.disclosure.notesHint
          }
          defaultOpen={notesOpen}
        >
          {renderNotesField()}
        </CollapsibleSection>
      )}

      <CollapsibleSection
        title={
          isPain
            ? strings.painBook.form.disclosure.attachments
            : strings.logBook.form.disclosure.attachments
        }
        hint={
          isPain
            ? strings.painBook.form.disclosure.attachmentsHint
            : strings.logBook.form.disclosure.attachmentsHint
        }
        defaultOpen={attachmentsOpen}
      >
        {/*
         * BE-listAttachmentLinks gap: the EntryDTO does not surface
         * already-linked attachments. We pass an empty initial list and any
         * new uploads will be attached to this entry on save.
         */}
        {mode === "edit" ? (
          <p className="text-xs text-muted-foreground">
            {formStrings.attachmentsEditNote}
          </p>
        ) : null}
        <UploaderShell
          uploaderRef={uploaderRef}
          linkedId={mode === "edit" && entry ? entry.id : undefined}
          disabled={submitting || deleting}
          onPendingChange={setPendingUploads}
        />
      </CollapsibleSection>

      <div
        className={cn(
          "sticky bottom-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom))] -mx-4 flex flex-col-reverse gap-2 border-t border-border bg-background/95 px-4 pb-[max(var(--safe-bottom),12px)] pt-3 backdrop-blur sm:-mx-6 sm:px-6 sm:flex-row sm:items-center sm:justify-between",
          "lg:static lg:mx-0 lg:bottom-auto lg:px-0 lg:pb-4 lg:bg-transparent lg:backdrop-blur-none",
        )}
      >
        <div className="flex items-center gap-2">
          {mode === "edit" ? (
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
          {pendingUploads ? (
            <span className="text-xs text-muted-foreground">
              {formStrings.pendingUploads}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              router.push(listHref);
              router.refresh();
            }}
            disabled={submitting}
          >
            {strings.actions.cancel}
          </Button>
          <Button type="submit" disabled={submitting || pendingUploads}>
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

      {mode === "edit" && entry ? (
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
  linkedId?: string;
  disabled?: boolean;
  onPendingChange: (pending: boolean) => void;
}

function UploaderShell({
  uploaderRef,
  linkedId,
  disabled,
  onPendingChange,
}: UploaderShellProps) {
  const props: AttachmentUploaderProps = {
    linkedType: "entry",
    linkedId,
    initialAttachments: [],
    disabled,
    onReadyChange: () => {
      onPendingChange(uploaderRef.current?.hasPendingUploads() ?? false);
    },
  };
  return <AttachmentUploader ref={uploaderRef} {...props} />;
}
