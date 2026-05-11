"use client";

import * as React from "react";
import type { CurrentProfile } from "@/server/services/auth";

export type ShellProfile = CurrentProfile | null;

export const ShellProfileContext = React.createContext<ShellProfile>(null);

export function useShellProfile(): ShellProfile {
  return React.useContext(ShellProfileContext);
}

export function ShellProfileProvider({
  profile,
  children,
}: {
  profile: ShellProfile;
  children: React.ReactNode;
}) {
  return (
    <ShellProfileContext.Provider value={profile}>
      {children}
    </ShellProfileContext.Provider>
  );
}
