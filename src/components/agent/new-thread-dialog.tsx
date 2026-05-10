"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { strings } from "@/lib/strings";

interface NewThreadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creating: boolean;
  onCreate: (title?: string) => Promise<void> | void;
}

export function NewThreadDialog({
  open,
  onOpenChange,
  creating,
  onCreate,
}: NewThreadDialogProps) {
  const [title, setTitle] = React.useState("");

  React.useEffect(() => {
    if (!open) setTitle("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{strings.agent.newThread.title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const trimmed = title.trim();
            await onCreate(trimmed.length > 0 ? trimmed : undefined);
          }}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-thread-title">
              {strings.agent.newThread.titleLabel}
            </Label>
            <Input
              id="new-thread-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={strings.agent.newThread.titlePlaceholder}
              maxLength={240}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={creating}
            >
              {strings.agent.newThread.cancel}
            </Button>
            <Button type="submit" disabled={creating}>
              {creating
                ? strings.agent.newThread.creating
                : strings.agent.newThread.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
