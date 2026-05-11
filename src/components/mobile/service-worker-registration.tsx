"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";

type BrowserServiceWorkerRegistration = Awaited<
  ReturnType<ServiceWorkerContainer["register"]>
>;

export function ServiceWorkerRegistration() {
  const [waitingRegistration, setWaitingRegistration] =
    React.useState<BrowserServiceWorkerRegistration | null>(null);
  const reloadRequestedRef = React.useRef(false);

  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let mounted = true;

    function markUpdateReady(registration: BrowserServiceWorkerRegistration) {
      if (!navigator.serviceWorker.controller) return;
      if (mounted) setWaitingRegistration(registration);
    }

    function watchRegistration(registration: BrowserServiceWorkerRegistration) {
      if (registration.waiting) {
        markUpdateReady(registration);
      }

      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;

        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && registration.waiting) {
            markUpdateReady(registration);
          }
        });
      });
    }

    function handleControllerChange() {
      if (!reloadRequestedRef.current) return;
      window.location.reload();
    }

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    async function registerServiceWorker() {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        watchRegistration(registration);
        await registration.update();
      } catch (error) {
        if (mounted) {
          console.warn("Bella service worker registration failed.", error);
        }
      }
    }

    void registerServiceWorker();

    return () => {
      mounted = false;
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
    };
  }, []);

  function reloadWithUpdate() {
    const waiting = waitingRegistration?.waiting;
    if (!waiting) {
      window.location.reload();
      return;
    }

    reloadRequestedRef.current = true;
    waiting.postMessage({ type: "BELLA_SKIP_WAITING" });
  }

  if (!waitingRegistration) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+0.75rem)] z-50 rounded-md border border-primary/30 bg-background p-3 shadow-lg lg:bottom-4 lg:left-auto lg:right-4 lg:w-80">
      <div className="flex items-start gap-3">
        <RefreshCw
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{strings.mobile.update.title}</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {strings.mobile.update.body}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0 gap-1.5"
          onClick={reloadWithUpdate}
        >
          {strings.mobile.update.action}
        </Button>
      </div>
    </div>
  );
}
