"use client";

import * as React from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { VasomotorForm } from "@/components/vasomotor/vasomotor-form";
import { strings } from "@/lib/strings";

export interface FlareVasomotorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flareEntryId: string;
}

export function FlareVasomotorSheet({
  open,
  onOpenChange,
  flareEntryId,
}: FlareVasomotorSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-xl flex-col gap-0 overflow-hidden p-0"
      >
        <SheetHeader>
          <SheetTitle>{strings.flare.active.vasomotorSheetTitle}</SheetTitle>
          <SheetDescription>
            {strings.flare.active.vasomotorSheetDescription}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <VasomotorForm
            mode="create"
            activeFlareEntryId={flareEntryId}
            defaultContext="active_flare"
            defaultLinkToFlare
            onSaved={() => {
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
            hideDelete
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
