import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";

export const metadata: Metadata = {
  title: `${strings.mobile.offline.title} | ${strings.app.name}`,
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 pb-[calc(var(--safe-bottom)+2rem)] pt-[calc(var(--safe-top)+2rem)] text-foreground">
      <div className="w-full max-w-sm rounded-md border border-border bg-card p-5 shadow-sm">
        <h1 className="text-lg font-semibold">
          {strings.mobile.offline.title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {strings.mobile.offline.body}
        </p>
        <Button asChild className="mt-4 w-full">
          <Link href="/dashboard">{strings.mobile.offline.action}</Link>
        </Button>
      </div>
    </main>
  );
}
