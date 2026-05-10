"use client";

import { Activity } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/feedback/empty-state";

import { FlareStartForm } from "./flare-start-form";

import { strings } from "@/lib/strings";
import type { BodyRegionDTO, SymptomDTO, TriggerDTO } from "@/server/contracts";

export interface NoActiveFlareProps {
  canWrite: boolean;
  bodyRegions: BodyRegionDTO[];
  symptoms: SymptomDTO[];
  triggers: TriggerDTO[];
}

export function NoActiveFlare({
  canWrite,
  bodyRegions,
  symptoms,
  triggers,
}: NoActiveFlareProps) {
  if (!canWrite) {
    return (
      <EmptyState
        icon={Activity}
        title={strings.flare.noActive.title}
        description={strings.flare.errors.noWriteRole}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <EmptyState
        icon={Activity}
        title={strings.flare.noActive.title}
        description={strings.flare.noActive.body}
      />
      <Card>
        <CardHeader>
          <CardTitle>{strings.flare.start.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            {strings.flare.start.subtitle}
          </p>
          <FlareStartForm
            bodyRegions={bodyRegions}
            symptoms={symptoms}
            triggers={triggers}
          />
        </CardContent>
      </Card>
    </div>
  );
}
