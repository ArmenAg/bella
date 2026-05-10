"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CircleCheck,
  Database,
  DownloadCloud,
  EyeOff,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  hasAcknowledgedDisclosure,
  recordDisclosureAck,
} from "@/components/shell/onboarding-gate";
import { strings } from "@/lib/strings";

const bullets = [
  { icon: Database, key: "scope" as const },
  { icon: Lock, key: "private" as const },
  { icon: EyeOff, key: "softDelete" as const },
  { icon: DownloadCloud, key: "export" as const },
];

export function OnboardingDisclosure() {
  const router = useRouter();
  const params = useSearchParams();
  const [alreadyAcked, setAlreadyAcked] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const replay = params.get("replay") === "1";

  React.useEffect(() => {
    setAlreadyAcked(hasAcknowledgedDisclosure());
  }, []);

  const handleAcknowledge = () => {
    setSubmitting(true);
    recordDisclosureAck();
    router.replace("/dashboard");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{strings.onboarding.heading}</CardTitle>
        <CardDescription>{strings.onboarding.intro}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex flex-col gap-3">
          {bullets.map(({ icon: Icon, key }) => (
            <li key={key} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/5 text-primary">
                <Icon aria-hidden="true" className="h-3.5 w-3.5" />
              </span>
              <p className="text-sm leading-6 text-foreground">
                {strings.onboarding.bullets[key]}
              </p>
            </li>
          ))}
        </ul>
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm leading-6 text-foreground">
          <span className="font-medium">In short. </span>
          {strings.onboarding.tldr}
        </div>
        <Alert variant="info">
          <CircleCheck aria-hidden="true" />
          <AlertDescription>
            {strings.onboarding.ackPersistedTodo}
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter className="justify-between">
        {replay || alreadyAcked ? (
          <Button variant="outline" onClick={() => router.replace("/settings")}>
            {strings.actions.back}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            {strings.common.required}
          </span>
        )}
        <Button onClick={handleAcknowledge} disabled={submitting}>
          {submitting ? strings.actions.saving : strings.onboarding.acknowledge}
        </Button>
      </CardFooter>
    </Card>
  );
}
