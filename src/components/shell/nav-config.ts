import {
  Activity,
  BookOpen,
  Bot,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Compass,
  FileArchive,
  FileText,
  GitBranch,
  GraduationCap,
  Home,
  ListChecks,
  Pill,
  Settings,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { strings } from "@/lib/strings";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** When true, mark the page as a stub. Used by sidebar visual treatment. */
  stub?: boolean;
}

export interface NavGroup {
  id: "primary" | "review" | "secondary" | "config";
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    id: "primary",
    label: strings.nav.primary,
    items: [
      {
        href: "/dashboard",
        label: strings.nav.dashboard,
        icon: Home,
      },
      {
        href: "/flare",
        label: strings.nav.flareMode,
        icon: Activity,
      },
      { href: "/pain-book", label: strings.nav.painBook, icon: BookOpen },
      { href: "/log-book", label: strings.nav.logBook, icon: ClipboardList },
      { href: "/agent", label: strings.agent.navLabel, icon: Bot },
    ],
  },
  {
    id: "review",
    label: strings.nav.review,
    items: [
      {
        href: "/timeline",
        label: strings.nav.timeline,
        icon: ListChecks,
      },
      {
        href: "/diagnostic-tree",
        label: strings.nav.diagnosticTree,
        icon: GitBranch,
      },
      {
        href: "/decisions",
        label: strings.nav.decisions,
        icon: Compass,
      },
      {
        href: "/import",
        label: strings.importNs.navLabel,
        icon: ClipboardCheck,
      },
    ],
  },
  {
    id: "secondary",
    label: strings.nav.secondary,
    items: [
      {
        href: "/schedule",
        label: strings.nav.schedule,
        icon: CalendarClock,
      },
      {
        href: "/medications",
        label: strings.nav.medications,
        icon: Pill,
      },
      {
        href: "/procedures",
        label: strings.nav.proceduresTests,
        icon: Stethoscope,
      },
      {
        href: "/sources",
        label: strings.nav.sourceLibrary,
        icon: GraduationCap,
      },
      {
        href: "/export",
        label: strings.nav.exportPacket,
        icon: FileArchive,
      },
    ],
  },
  {
    id: "config",
    label: strings.nav.config,
    items: [{ href: "/settings", label: strings.nav.settings, icon: Settings }],
  },
];

export const allNavItems: NavItem[] = navGroups.flatMap((group) => group.items);

export const DOCS_LINK_ICON = FileText;
