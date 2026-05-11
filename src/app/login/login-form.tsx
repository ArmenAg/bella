"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";
import { signInWithPasswordForm } from "@/server/actions/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { strings } from "@/lib/strings";

interface LoginFormProps {
  showDemoCredentials: boolean;
}

export function LoginForm({ showDemoCredentials }: LoginFormProps) {
  const searchParams = useSearchParams();
  const [state, formAction, pending] = React.useActionState(
    signInWithPasswordForm,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input
        type="hidden"
        name="next"
        value={searchParams.get("next") ?? "/dashboard"}
      />

      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>{strings.common.errorTitle}</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="email">{strings.login.emailLabel}</Label>
        <Input
          id="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          defaultValue={showDemoCredentials ? "bella.demo@example.test" : ""}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">{strings.login.passwordLabel}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          defaultValue={showDemoCredentials ? "local-demo-password" : ""}
          required
        />
      </div>

      {showDemoCredentials ? (
        <p className="rounded-md border border-border bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
          {strings.login.demoNotice}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="gap-2">
        <KeyRound aria-hidden="true" className="h-4 w-4" />
        {pending ? strings.login.submitPending : strings.login.submit}
      </Button>
    </form>
  );
}
