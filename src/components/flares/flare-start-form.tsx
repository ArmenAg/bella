"use client";

import * as React from "react";
import { Controller, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { Field } from "@/components/entries/field";
import { PainSegmented } from "@/components/entries/pain-segmented";
import { ToggleChip } from "@/components/entries/toggle-chip";

import { startFlare } from "@/server/actions/flares";
import { startFlareInputSchema } from "@/server/contracts/flares";
import type {
  BodyRegionDTO,
  StartFlareInput,
  SymptomDTO,
  TriggerDTO,
} from "@/server/contracts";

import {
  fromLocalDateTimeInputValue,
  toLocalDateTimeInputValue,
} from "@/lib/format";
import { strings } from "@/lib/strings";
import { userFacingErrorMessage } from "@/lib/result";

type StartFlareFormValues = z.input<typeof startFlareInputSchema>;

export interface FlareStartFormProps {
  bodyRegions: BodyRegionDTO[];
  symptoms: SymptomDTO[];
  triggers: TriggerDTO[];
}

function nowIsoForInput(): string {
  return toLocalDateTimeInputValue(new Date().toISOString());
}

function buildDefaults(): StartFlareFormValues {
  return {
    occurred_at: new Date().toISOString(),
    title: "Flare",
    pain_current: undefined,
    pain_peak: undefined,
    primary_trigger_id: undefined,
    body_region_ids: [],
    symptoms: [],
    triggers: [],
    notes: undefined,
    client_recorded_at: undefined,
  };
}

function firstZodError(
  errors: FieldErrors<StartFlareFormValues>,
): string | null {
  for (const key in errors) {
    const value = errors[key as keyof StartFlareFormValues];
    if (value && typeof value === "object" && "message" in value) {
      const message = (value as { message?: string }).message;
      if (message) return message;
    }
  }
  return null;
}

export function FlareStartForm({
  bodyRegions,
  symptoms,
  triggers,
}: FlareStartFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<StartFlareFormValues>({
    resolver: zodResolver(startFlareInputSchema),
    defaultValues: buildDefaults(),
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

  const watchedTriggers = watch("triggers") ?? [];
  const watchedPrimaryTrigger = watch("primary_trigger_id");

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

  const triggerLookup = React.useMemo(
    () => new Map(triggers.map((trigger) => [trigger.id, trigger])),
    [triggers],
  );

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const payload: StartFlareInput = {
        ...values,
        triggers: values.triggers ?? [],
        body_region_ids: values.body_region_ids ?? [],
        symptoms: values.symptoms ?? [],
      };
      const result = await startFlare(payload);
      if (!result.ok) {
        setServerError(userFacingErrorMessage(result.error));
        return;
      }
      router.refresh();
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : strings.errors.generic,
      );
    } finally {
      setSubmitting(false);
    }
  });

  const validationSummary = firstZodError(errors);
  const startStrings = strings.flare.start;

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
          <CardTitle>{startStrings.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            id="flare-title"
            label={startStrings.titleField}
            error={errors.title?.message}
          >
            <Input
              id="flare-title"
              placeholder={startStrings.titlePlaceholder}
              aria-invalid={errors.title ? true : undefined}
              {...register("title")}
            />
          </Field>

          <Field
            id="flare-occurred-at"
            label={startStrings.occurredAt}
            error={errors.occurred_at?.message}
          >
            <Controller
              control={control}
              name="occurred_at"
              render={({ field }) => (
                <Input
                  id="flare-occurred-at"
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

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              id="flare-pain-current"
              label={startStrings.painCurrent}
              optional
              error={errors.pain_current?.message}
            >
              <Controller
                control={control}
                name="pain_current"
                render={({ field }) => (
                  <PainSegmented
                    id="flare-pain-current"
                    value={field.value ?? undefined}
                    onChange={(next) => field.onChange(next)}
                    ariaLabel={startStrings.painCurrent}
                  />
                )}
              />
            </Field>
            <Field
              id="flare-pain-peak"
              label={startStrings.painPeak}
              optional
              error={errors.pain_peak?.message}
            >
              <Controller
                control={control}
                name="pain_peak"
                render={({ field }) => (
                  <PainSegmented
                    id="flare-pain-peak"
                    value={field.value ?? undefined}
                    onChange={(next) => field.onChange(next)}
                    ariaLabel={startStrings.painPeak}
                  />
                )}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{startStrings.bodyRegions}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Field label={startStrings.bodyRegions} optional>
            <Controller
              control={control}
              name="body_region_ids"
              render={({ field }) => {
                const selected = new Set(field.value ?? []);
                if (orderedRegions.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground">
                      {strings.flare.errors.noBodyRegions}
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

          <Field label={startStrings.symptoms} optional>
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
                      {strings.flare.errors.noSymptoms}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{strings.painBook.form.triggers}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
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

                // Auto-select first trigger as primary; clear primary if removed.
                if (!isActive) {
                  const currentPrimary = watchedPrimaryTrigger;
                  if (!currentPrimary) {
                    setValue("primary_trigger_id", id, { shouldDirty: true });
                  }
                } else if (watchedPrimaryTrigger === id) {
                  setValue("primary_trigger_id", undefined, {
                    shouldDirty: true,
                  });
                }
              };
              if (bellaTriggers.length === 0 && otherTriggers.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground">
                    {strings.flare.errors.noTriggers}
                  </p>
                );
              }
              return (
                <div className="flex flex-col gap-3">
                  {bellaTriggers.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {startStrings.bellaTriggers}
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
                        {startStrings.generalTriggers}
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

          {watchedTriggers.length > 0 ? (
            <Field
              id="flare-primary-trigger"
              label={startStrings.primaryTrigger}
              optional
              error={errors.primary_trigger_id?.message}
            >
              <Controller
                control={control}
                name="primary_trigger_id"
                render={({ field }) => (
                  <Select
                    value={field.value ?? undefined}
                    onValueChange={(next) => field.onChange(next)}
                  >
                    <SelectTrigger id="flare-primary-trigger">
                      <SelectValue placeholder={strings.common.selectOne} />
                    </SelectTrigger>
                    <SelectContent>
                      {watchedTriggers.map((entry) => {
                        const trigger = triggerLookup.get(entry.trigger_id);
                        if (!trigger) return null;
                        return (
                          <SelectItem key={trigger.id} value={trigger.id}>
                            {trigger.name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{startStrings.notes}</CardTitle>
        </CardHeader>
        <CardContent>
          <Field id="flare-notes" label={startStrings.notes} optional>
            <Textarea
              id="flare-notes"
              rows={4}
              placeholder={startStrings.notesPlaceholder}
              {...register("notes")}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              {startStrings.submitting}
            </>
          ) : (
            startStrings.submit
          )}
        </Button>
      </div>
    </form>
  );
}
