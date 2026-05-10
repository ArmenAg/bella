"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";

const STORAGE_KEY = "bella:onboarding-ack-v1";

export function hasAcknowledgedDisclosure(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function recordDisclosureAck(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // Ignore — Safari private mode etc.
  }
}

export function clearDisclosureAck(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}

const EXEMPT_PATHS = new Set(["/onboarding"]);

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (EXEMPT_PATHS.has(pathname)) {
      return;
    }
    if (!hasAcknowledgedDisclosure()) {
      router.replace("/onboarding");
      return;
    }
  }, [pathname, router]);

  return <>{children}</>;
}
