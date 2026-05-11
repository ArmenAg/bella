"use client";

import * as React from "react";
import Link from "next/link";
import {
  DownloadCloud,
  KeyRound,
  Shield,
  Smartphone,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { MobileFeatureFlagsStatus } from "@/components/mobile/mobile-feature-flags-status";
import { InstallInstructionsSettings } from "@/components/mobile/install-instructions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/feedback/empty-state";
import { strings } from "@/lib/strings";
import type { CurrentProfile } from "@/server/services/auth";

const ROLE_LABEL: Record<CurrentProfile["role"], string> = {
  primary: strings.settings.roleNames.primary,
  caregiver: strings.settings.roleNames.caregiver,
  viewer: strings.settings.roleNames.viewer,
  clinician_readonly: strings.settings.roleNames.clinician_readonly,
};

const ROLE_VARIANT: Record<
  CurrentProfile["role"],
  "primary" | "default" | "muted" | "outline"
> = {
  primary: "muted",
  caregiver: "muted",
  viewer: "muted",
  clinician_readonly: "muted",
};

interface SettingsClientProps {
  profile: CurrentProfile | null;
}

export function SettingsClient({ profile }: SettingsClientProps) {
  const isReadOnly =
    profile?.role === "viewer" || profile?.role === "clinician_readonly";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound aria-hidden="true" className="h-4 w-4 text-primary" />
            {strings.settings.sections.profile}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {profile ? (
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                  {strings.settings.profile.emailLabel}
                </dt>
                <dd className="mt-1 text-sm">{profile.email}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                  {strings.settings.profile.roleLabel}
                </dt>
                <dd className="mt-1">
                  <Badge variant={ROLE_VARIANT[profile.role]}>
                    {ROLE_LABEL[profile.role]}
                  </Badge>
                </dd>
              </div>
            </dl>
          ) : (
            <EmptyState
              title={strings.auth.signedOutTitle}
              description={strings.auth.signedOutBody}
            />
          )}
          {isReadOnly ? (
            <p className="text-sm leading-6 text-muted-foreground">
              {strings.settings.profile.readOnlyNotice}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users aria-hidden="true" className="h-4 w-4 text-primary" />
            {strings.settings.sections.family}
          </CardTitle>
          <CardDescription>
            {strings.settings.family.placeholder}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-card">
            {profile ? (
              <li className="flex items-center justify-between px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">{profile.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {strings.settings.family.currentUser}
                  </p>
                </div>
                <Badge variant={ROLE_VARIANT[profile.role]}>
                  {ROLE_LABEL[profile.role]}
                </Badge>
              </li>
            ) : (
              <li className="px-3 py-3 text-sm text-muted-foreground">
                {strings.common.none}
              </li>
            )}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield aria-hidden="true" className="h-4 w-4 text-primary" />
            {strings.settings.sections.security}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {strings.settings.security.mfaLabel}
              </p>
              <Badge variant="muted">{strings.common.comingSoon}</Badge>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {strings.settings.security.mfaPlaceholder}
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {strings.settings.security.sessionLabel}
              </p>
              <Badge variant="muted">{strings.common.comingSoon}</Badge>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {strings.settings.security.sessionPlaceholder}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound aria-hidden="true" className="h-4 w-4 text-primary" />
            {strings.settings.sections.privacy}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">
              {strings.settings.privacy.replayLabel}
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              {strings.settings.privacy.replayDescription}
            </p>
            <Button asChild variant="outline" size="sm" className="self-start">
              <Link href="/onboarding?replay=1">
                {strings.actions.replayDisclosure}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone aria-hidden="true" className="h-4 w-4 text-primary" />
            {strings.settings.sections.mobile}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <InstallInstructionsSettings />
          <MobileFeatureFlagsStatus />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DownloadCloud
              aria-hidden="true"
              className="h-4 w-4 text-primary"
            />
            {strings.settings.sections.data}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {strings.settings.data.exportLabel}
              </p>
              <Badge variant="muted">{strings.common.comingSoon}</Badge>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {strings.settings.data.exportPlaceholder}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                <Trash2
                  aria-hidden="true"
                  className="mr-1 inline h-3.5 w-3.5 text-muted-foreground"
                />
                {strings.settings.data.trashLabel}
              </p>
              <Badge variant="muted">{strings.common.comingSoon}</Badge>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {strings.settings.data.trashPlaceholder}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
