"use client";

import * as React from "react";
import { Smartphone, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";
import { mobileFeatureFlags } from "@/lib/mobile/feature-flags";
import { isProbablyIos, isProbablyMobileSafari } from "@/lib/mobile/platform";
import { isStandaloneDisplay } from "@/lib/mobile/standalone";

const INSTALL_PROMPT_DISMISSED_AT = "bella.installPrompt.dismissedAt";
const INSTALL_PROMPT_DISMISS_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function hasRecentDismissal(): boolean {
  try {
    const dismissedAt = window.localStorage.getItem(
      INSTALL_PROMPT_DISMISSED_AT,
    );
    if (!dismissedAt) return false;

    const timestamp = Number(dismissedAt);
    if (!Number.isFinite(timestamp)) return false;

    return Date.now() - timestamp < INSTALL_PROMPT_DISMISS_DAYS * DAY_MS;
  } catch {
    return false;
  }
}

export function InstallInstructionsPrompt() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (!mobileFeatureFlags.mobileInstallPromptEnabled) return;

    setVisible(
      isProbablyIos() &&
        isProbablyMobileSafari() &&
        !isStandaloneDisplay() &&
        !hasRecentDismissal(),
    );
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(
        INSTALL_PROMPT_DISMISSED_AT,
        String(Date.now()),
      );
    } catch {
      // Ignore storage failures; the prompt can safely reappear later.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <section
      aria-labelledby="mobile-install-title"
      className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm lg:hidden"
    >
      <Smartphone
        aria-hidden="true"
        className="mt-0.5 h-4 w-4 shrink-0 text-primary"
      />
      <div className="min-w-0 flex-1">
        <h2 id="mobile-install-title" className="font-medium">
          {strings.mobile.install.title}
        </h2>
        <p className="mt-1 leading-6 text-muted-foreground">
          {strings.mobile.install.body}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="shrink-0 gap-1 px-2"
        onClick={dismiss}
      >
        <X aria-hidden="true" className="h-3.5 w-3.5" />
        {strings.mobile.install.dismiss}
      </Button>
    </section>
  );
}

export function InstallInstructionsSettings() {
  const [installed, setInstalled] = React.useState(false);

  React.useEffect(() => {
    setInstalled(isStandaloneDisplay());
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm leading-6 text-muted-foreground">
          {strings.mobile.install.settingsBody}
        </p>
        <Badge variant={installed ? "primary" : "muted"}>
          {installed
            ? strings.mobile.install.installed
            : strings.mobile.install.browser}
        </Badge>
      </div>
      <ol className="list-decimal space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
        <li>{strings.mobile.install.stepSafari}</li>
        <li>{strings.mobile.install.stepShare}</li>
        <li>{strings.mobile.install.stepName}</li>
      </ol>
    </div>
  );
}
