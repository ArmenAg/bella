"use client";

import * as React from "react";
import type { FlareSessionDTO } from "@/server/contracts";

const ActiveFlareContext = React.createContext<FlareSessionDTO | null>(null);

export function ActiveFlareProvider({
  flare,
  children,
}: {
  flare: FlareSessionDTO | null;
  children: React.ReactNode;
}) {
  return (
    <ActiveFlareContext.Provider value={flare}>
      {children}
    </ActiveFlareContext.Provider>
  );
}

export function useActiveFlare(): FlareSessionDTO | null {
  return React.useContext(ActiveFlareContext);
}
