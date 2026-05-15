"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { PainSegmented } from "@/components/entries/pain-segmented";

import { addFlareCheckpoint } from "@/server/actions/flares";
import type { FlareCheckpointInput, FlareSessionDTO } from "@/server/contracts";

import { strings } from "@/lib/strings";
import { userFacingErrorMessage } from "@/lib/result";

const quickStrings = strings.flare.quickCheckpoint;

type CheckpointType = FlareCheckpointInput["checkpoint_type"];

const TYPE_BUTTON_LABELS: Record<CheckpointType, string> =
  quickStrings.typeLabels;

/**
 * Pick the most-likely checkpoint type given how long ago the flare started
 * and which checkpoint types already exist. Returns "custom" if nothing fits.
 *
 * Mirrors the logic in `flare-checkpoint-form.tsx` so the two surfaces always
 * agree; if either gets clever this should move into `src/lib/flares.ts`.
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

export interface QuickCheckpointButtonProps {
  session: FlareSessionDTO;
  onAdded?: (session: FlareSessionDTO) => void;
}

/**
 * Two-tap quick capture for the next checkpoint. Tap once to expand; tap a
 * pain digit + Save (which counts as one combined gesture) to record.
 */
export function QuickCheckpointButton({
  session,
  onAdded,
}: QuickCheckpointButtonProps) {
  const router = useRouter();
  const [expanded, setExpanded] = React.useState(false);
  const [pain, setPain] = React.useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const existingTypes = React.useMemo<ReadonlyArray<CheckpointType>>(
    () => session.checkpoints.map((cp) => cp.checkpoint_type),
    [session.checkpoints],
  );

  const suggestedType = React.useMemo(
    () => suggestCheckpointType(session.entry.occurred_at, existingTypes),
    [session.entry.occurred_at, existingTypes],
  );

  const buttonLabel =
    suggestedType === "custom"
      ? quickStrings.buttonGenericLabel
      : `${quickStrings.buttonPrefix} ${TYPE_BUTTON_LABELS[suggestedType]} ${quickStrings.buttonSuffix}`;

  const reset = React.useCallback(() => {
    setExpanded(false);
    setPain(undefined);
    setServerError(null);
  }, []);

  const handleSave = React.useCallback(async () => {
    setServerError(null);
    setSubmitting(true);
    try {
      const result = await addFlareCheckpoint({
        entry_id: session.entry.id,
        checkpoint_type: suggestedType,
        checkpoint_at: new Date().toISOString(),
        pain_score: pain,
        symptoms: [],
        notes: undefined,
      });
      if (!result.ok) {
        setServerError(userFacingErrorMessage(result.error));
        return;
      }
      reset();
      onAdded?.(result.data);
      router.refresh();
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : strings.errors.generic,
      );
    } finally {
      setSubmitting(false);
    }
  }, [session.entry.id, suggestedType, pain, onAdded, reset, router]);

  if (!expanded) {
    return (
      <Button
        type="button"
        size="lg"
        className="w-full sm:w-auto"
        onClick={() => setExpanded(true)}
      >
        {buttonLabel}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{buttonLabel}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={reset}
          disabled={submitting}
        >
          {quickStrings.cancel}
        </Button>
      </div>

      {serverError ? (
        <Alert variant="destructive">
          <AlertTitle>{strings.common.errorTitle}</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <PainSegmented
        value={pain}
        onChange={(next) => setPain(next)}
        ariaLabel={quickStrings.painLabel}
        disabled={submitting}
      />

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              {quickStrings.saving}
            </>
          ) : (
            quickStrings.save
          )}
        </Button>
      </div>
    </div>
  );
}
