"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { strings } from "@/lib/strings";

export interface DestructiveConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /**
   * Soft-delete reason. The backend doesn't accept the reason yet, but the
   * field is captured here as a UX expectation; once the backend exposes a
   * reason field on softDeleteEntry, this value will be sent through.
   */
  requireReason?: boolean;
  confirming?: boolean;
  onConfirm: (reason: string) => void;
}

export function DestructiveConfirm({
  open,
  onOpenChange,
  title,
  description = strings.common.destructive_confirm,
  requireReason = false,
  confirming = false,
  onConfirm,
}: DestructiveConfirmProps) {
  const [reason, setReason] = React.useState("");
  const reasonId = React.useId();

  React.useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  const disabled = confirming || (requireReason && reason.trim().length === 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {requireReason ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={reasonId}>
              {strings.common.soft_delete_reason_label}
            </Label>
            <Textarea
              id={reasonId}
              placeholder={strings.common.soft_delete_reason_placeholder}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
            />
          </div>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={confirming}
          >
            {strings.actions.cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(reason.trim())}
            disabled={disabled}
          >
            {confirming
              ? strings.actions.deleting
              : strings.common.destructive_confirm_action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
