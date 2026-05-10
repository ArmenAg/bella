"use client";

import * as React from "react";

import { useActiveFlare } from "@/components/shell/active-flare-context";
import { ActiveFlareView } from "./active-flare-view";
import { FlareSummaryCard } from "./flare-summary-card";
import { NoActiveFlare } from "./no-active-flare";
import type {
  BodyRegionDTO,
  FlareSessionDTO,
  SymptomDTO,
  TriggerDTO,
} from "@/server/contracts";

export interface FlarePageClientProps {
  /** The flare session resolved at request time. The shell context may have a
   *  newer or null value (e.g. right after the user ends a flare). We render
   *  whichever has fresher data. */
  initialSession: FlareSessionDTO | null;
  bodyRegions: BodyRegionDTO[];
  symptoms: SymptomDTO[];
  triggers: TriggerDTO[];
  canWrite: boolean;
}

export function FlarePageClient({
  initialSession,
  bodyRegions,
  symptoms,
  triggers,
  canWrite,
}: FlarePageClientProps) {
  const contextSession = useActiveFlare();
  // Prefer the shell-context value because it gets refreshed after every
  // mutation that touches the active flare. Fall back to the server-provided
  // initial session.
  const session = contextSession ?? initialSession;

  // When the user ends a flare from the active view, the dialog shows the
  // resulting (now-ended) session here so the summary stays on screen until
  // they navigate away.
  const [justEnded, setJustEnded] = React.useState<FlareSessionDTO | null>(
    null,
  );

  // If a new active flare appears, drop any stale "just ended" snapshot.
  React.useEffect(() => {
    if (session?.entry.flare_status === "active") {
      setJustEnded(null);
    }
  }, [session]);

  // Active flare in progress.
  if (session && session.entry.flare_status === "active") {
    return (
      <ActiveFlareView
        session={session}
        bodyRegions={bodyRegions}
        symptoms={symptoms}
        triggers={triggers}
        canWrite={canWrite}
        onEnded={(ended) => setJustEnded(ended)}
      />
    );
  }

  // No active flare — show summary of the just-ended one if available, then
  // the empty state and start-flare form.
  return (
    <div className="flex flex-col gap-6">
      {justEnded ? (
        <FlareSummaryCard
          session={justEnded}
          bodyRegions={bodyRegions}
          symptoms={symptoms}
          triggers={triggers}
        />
      ) : null}
      <NoActiveFlare
        canWrite={canWrite}
        bodyRegions={bodyRegions}
        symptoms={symptoms}
        triggers={triggers}
      />
    </div>
  );
}
