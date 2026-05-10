"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { Field } from "@/components/entries/field";
import { PainSegmented } from "@/components/entries/pain-segmented";
import { ToggleChip } from "@/components/entries/toggle-chip";

import { addFlareCheckpoint } from "@/server/actions/flares";
import { flareCheckpointInputSchema } from "@/server/contracts/flares";
import type { FlareSessionDTO } from "@/server/contracts";

import {
  fromLocalDateTimeInputValue,
  toLocalDateTimeInputValue,
} from "@/lib/format";
import { strings } from "@/lib/strings";
import { userFacingErrorMessage } from "@/lib/result";

type FlareCheckpointFormValues = z.input<typeof flareCheckpointInputSchema>;

type CheckpointType = FlareCheckpointFormValues["checkpoint_type"];

const CHECKPOINT_TYPES: CheckpointType[] = [
  "start",
  "30m",
  "60m",
  "120m",
  "6h",
  "12h",
  "24h",
  "48h",
  "custom",
];

/**
 * Pick the most-likely checkpoint type given how long ago the flare started
 * and which checkpoint types already exist. Returns "custom" if nothing fits.
 */
function suggestCheckpointType(
  startedAtIso: string,
  existingTypes: ReadonlyArray<CheckpointType>,
): CheckpointType {
  const startedAt = Date.parse(startedAtIso);
  if (!Number.isFinite(startedAt)) return "custom";
  const minutesElapsed = Math.max(
    0,
    Math.round((Date.now() - startedAt) / 60_000),
  );

  const candidates: Array<{ type: CheckpointType; minutes: number }> = [
    { type: "30m", minutes: 30 },
    { type: "60m", minutes: 60 },
    { type: "120m", minutes: 120 },
    { type: "6h", minutes: 360 },
    { type: "12h", minutes: 720 },
    { type: "24h", minutes: 1440 },
    { type: "48h", minutes: 2880 },
  ];
  let best: CheckpointType = "custom";
  let bestDiff = Infinity;
  for (const candidate of candidates) {
    if (existingTypes.includes(candidate.type)) continue;
    const diff = Math.abs(candidate.minutes - minutesElapsed);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = candidate.type;
    }
  }
  return best;
}

export interface FlareCheckpointFormProps {
  session: FlareSessionDTO;
  onAdded?: (session: FlareSessionDTO) => void;
}

export function FlareCheckpointForm({
  session,
  onAdded,
}: FlareCheckpointFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const existingTypes = React.useMemo(
    () => session.checkpoints.map((cp) => cp.checkpoint_type),
    [session.checkpoints],
  );

  const suggestedType = React.useMemo(
    () => suggestCheckpointType(session.entry.occurred_at, existingTypes),
    [session.entry.occurred_at, existingTypes],
  );

  const buildDefaults = React.useCallback(
    (): FlareCheckpointFormValues => ({
      entry_id: session.entry.id,
      checkpoint_type: suggestedType,
      checkpoint_at: new Date().toISOString(),
      pain_score: undefined,
      symptoms: [],
      notes: undefined,
    }),
    [session.entry.id, suggestedType],
  );

  const form = useForm<FlareCheckpointFormValues>({
    resolver: zodResolver(flareCheckpointInputSchema),
    defaultValues: buildDefaults(),
    mode: "onTouched",
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = form;

  // Refresh defaults when the active flare changes (different entry id) or
  // when checkpoints change so the suggested type stays current.
  React.useEffect(() => {
    reset(buildDefaults());
  }, [reset, buildDefaults]);

  const watchedType = watch("checkpoint_type");
  const checkpointStrings = strings.flare.checkpoint;
  const typeLabels = checkpointStrings.checkpointTypes;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const result = await addFlareCheckpoint({
        entry_id: values.entry_id,
        checkpoint_type: values.checkpoint_type,
        checkpoint_at: values.checkpoint_at,
        pain_score: values.pain_score,
        symptoms: values.symptoms ?? [],
        notes: values.notes,
      });
      if (!result.ok) {
        setServerError(userFacingErrorMessage(result.error));
        return;
      }
      reset(buildDefaults());
      onAdded?.(result.data);
      router.refresh();
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : strings.errors.generic,
      );
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-md border border-border bg-card p-4"
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold">{checkpointStrings.title}</p>
        <p className="text-xs text-muted-foreground">
          {strings.flare.active.addCheckpointSubtitle}
        </p>
      </div>

      {serverError ? (
        <Alert variant="destructive">
          <AlertTitle>{strings.common.errorTitle}</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <Field label={checkpointStrings.type}>
        <Controller
          control={control}
          name="checkpoint_type"
          render={({ field }) => (
            <div className="flex flex-wrap gap-1.5">
              {CHECKPOINT_TYPES.map((type) => {
                const active = field.value === type;
                return (
                  <ToggleChip
                    key={type}
                    active={active}
                    onToggle={() => field.onChange(type)}
                  >
                    {typeLabels[type]}
                  </ToggleChip>
                );
              })}
            </div>
          )}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id="checkpoint-at"
          label={checkpointStrings.checkpointAt}
          error={errors.checkpoint_at?.message}
        >
          <Controller
            control={control}
            name="checkpoint_at"
            render={({ field }) => (
              <Input
                id="checkpoint-at"
                type="datetime-local"
                value={
                  field.value
                    ? toLocalDateTimeInputValue(field.value)
                    : toLocalDateTimeInputValue(new Date().toISOString())
                }
                onChange={(event) => {
                  const next = fromLocalDateTimeInputValue(event.target.value);
                  if (next) field.onChange(next);
                }}
                aria-invalid={errors.checkpoint_at ? true : undefined}
              />
            )}
          />
        </Field>
        <div className="flex items-end">
          <p className="text-xs text-muted-foreground">
            {typeLabels[watchedType]}
          </p>
        </div>
      </div>

      <Field
        id="checkpoint-pain"
        label={checkpointStrings.painScore}
        optional
        error={errors.pain_score?.message}
      >
        <Controller
          control={control}
          name="pain_score"
          render={({ field }) => (
            <PainSegmented
              id="checkpoint-pain"
              value={field.value ?? undefined}
              onChange={(next) => field.onChange(next)}
              ariaLabel={checkpointStrings.painScore}
            />
          )}
        />
      </Field>

      <Field
        id="checkpoint-notes"
        label={checkpointStrings.notes}
        optional
        error={errors.notes?.message}
      >
        <Textarea
          id="checkpoint-notes"
          rows={3}
          placeholder={checkpointStrings.notesPlaceholder}
          {...register("notes")}
        />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              {checkpointStrings.submitting}
            </>
          ) : (
            checkpointStrings.submit
          )}
        </Button>
      </div>
    </form>
  );
}
