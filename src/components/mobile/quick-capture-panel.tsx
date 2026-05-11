import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Camera,
  ClipboardPenLine,
  Pill,
  PlusCircle,
} from "lucide-react";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

type QuickCaptureAction = {
  id: "pain" | "flare" | "log" | "medication" | "photo";
  label: string;
  href: string;
  icon: LucideIcon;
  tone?: "default" | "urgent" | "quiet";
};

const ACTIONS: QuickCaptureAction[] = [
  {
    id: "pain",
    label: strings.mobile.quickCapture.pain,
    href: "/pain-book/new?quick=1",
    icon: PlusCircle,
    tone: "default",
  },
  {
    id: "flare",
    label: strings.mobile.quickCapture.flare,
    href: "/flare",
    icon: Activity,
    tone: "urgent",
  },
  {
    id: "log",
    label: strings.mobile.quickCapture.log,
    href: "/log-book/new?quick=1",
    icon: ClipboardPenLine,
    tone: "quiet",
  },
  {
    id: "medication",
    label: strings.mobile.quickCapture.medication,
    href: "/medications/responses/new?quick=1",
    icon: Pill,
    tone: "quiet",
  },
  {
    id: "photo",
    label: strings.mobile.quickCapture.photo,
    href: "/vasomotor/new?quick=1",
    icon: Camera,
    tone: "quiet",
  },
];

const TONE_CLASSES: Record<NonNullable<QuickCaptureAction["tone"]>, string> = {
  default: "border-primary/30 bg-primary/5 text-primary",
  urgent: "border-accent/50 bg-accent/15 text-accent-foreground",
  quiet: "border-border bg-card text-foreground",
};

export function QuickCapturePanel() {
  return (
    <section
      aria-label={strings.mobile.quickCapture.title}
      className="lg:hidden"
    >
      <div className="grid grid-cols-5 gap-2">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.id}
              href={action.href}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md border px-1.5 py-2 text-center text-[11px] font-medium leading-tight transition-colors hover:bg-muted",
                TONE_CLASSES[action.tone ?? "default"],
              )}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              <span>{action.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
