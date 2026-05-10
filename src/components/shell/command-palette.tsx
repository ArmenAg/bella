"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  CalendarClock,
  ListChecks,
  Pill,
  Plus,
  Search,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { allNavItems } from "./nav-config";

interface CommandPaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const CommandPaletteContext =
  React.createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = React.useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error(
      "useCommandPalette must be used within a CommandPaletteProvider",
    );
  }
  return ctx;
}

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const value = React.useMemo<CommandPaletteContextValue>(
    () => ({
      open,
      setOpen,
      toggle: () => setOpen((current) => !current),
    }),
    [open],
  );

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isModK =
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === "k";
      if (isModK) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

interface CommandItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  group: "pages" | "create";
}

const CREATE_ACTIONS: ReadonlyArray<Omit<CommandItem, "group">> = [
  {
    id: "create-pain-entry",
    label: strings.painBook.newCta,
    href: "/pain-book/new",
    icon: Plus,
  },
  {
    id: "create-log-entry",
    label: strings.logBook.newCta,
    href: "/log-book/new",
    icon: Plus,
  },
  {
    id: "create-flare",
    label: strings.actions.startFlare,
    href: "/flare",
    icon: Activity,
  },
  {
    id: "create-medication",
    label: strings.medications.newCta,
    href: "/medications/new",
    icon: Pill,
  },
  {
    id: "create-appointment",
    label: strings.schedule.appointments.newCta,
    href: "/schedule/appointments/new",
    icon: CalendarClock,
  },
  {
    id: "create-task",
    label: strings.schedule.tasks.newCta,
    href: "/schedule/tasks/new",
    icon: ListChecks,
  },
];

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const pageItems: CommandItem[] = React.useMemo(
    () =>
      allNavItems.map((item) => ({
        id: `page-${item.href}`,
        label: item.label,
        href: item.href,
        icon: item.icon,
        group: "pages" as const,
      })),
    [],
  );

  const createItems: CommandItem[] = React.useMemo(
    () =>
      CREATE_ACTIONS.map((action) => ({
        ...action,
        group: "create" as const,
      })),
    [],
  );

  const trimmed = query.trim().toLowerCase();
  const filteredPages = trimmed
    ? pageItems.filter((item) => item.label.toLowerCase().includes(trimmed))
    : pageItems;
  const filteredCreate = trimmed
    ? createItems.filter((item) => item.label.toLowerCase().includes(trimmed))
    : createItems;

  const flat: CommandItem[] = React.useMemo(
    () => [...filteredPages, ...filteredCreate],
    [filteredPages, filteredCreate],
  );

  // Reset state when opening; focus the input.
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // Defer focus until after Radix mounts content.
      const id = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  // Clamp the active index when the filtered set changes.
  React.useEffect(() => {
    if (activeIndex >= flat.length) {
      setActiveIndex(flat.length === 0 ? 0 : flat.length - 1);
    }
  }, [flat.length, activeIndex]);

  // Scroll the active option into view.
  React.useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function activate(item: CommandItem) {
    setOpen(false);
    router.push(item.href);
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (flat.length === 0) return;
      setActiveIndex((current) => (current + 1) % flat.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (flat.length === 0) return;
      setActiveIndex((current) => (current - 1 + flat.length) % flat.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = flat[activeIndex];
      if (item) activate(item);
    }
  }

  function renderGroup(
    label: string,
    items: CommandItem[],
    startIndex: number,
  ) {
    if (items.length === 0) return null;
    return (
      <div className="py-1">
        <div className="px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        {items.map((item, i) => {
          const overallIndex = startIndex + i;
          const Icon = item.icon;
          const active = overallIndex === activeIndex;
          return (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={active}
              data-index={overallIndex}
              onMouseEnter={() => setActiveIndex(overallIndex)}
              onClick={() => activate(item)}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm leading-5 transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted",
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showClose={false}
        className="max-w-lg overflow-hidden p-0"
        onOpenAutoFocus={(event) => {
          // Focus is moved manually to the input.
          event.preventDefault();
        }}
      >
        <DialogTitle className="sr-only">
          {strings.commandPalette.title}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {strings.commandPalette.description}
        </DialogDescription>
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search
            aria-hidden="true"
            className="h-4 w-4 text-muted-foreground"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder={strings.commandPalette.placeholder}
            aria-label={strings.commandPalette.inputAriaLabel}
            aria-controls="command-palette-list"
            aria-activedescendant={
              flat[activeIndex]
                ? `command-palette-item-${activeIndex}`
                : undefined
            }
            className={cn(
              "flex h-11 w-full bg-transparent text-sm leading-6 text-foreground",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none",
            )}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div
          id="command-palette-list"
          ref={listRef}
          role="listbox"
          aria-label={strings.commandPalette.listAriaLabel}
          className="max-h-[60vh] overflow-y-auto py-1"
        >
          {flat.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {strings.commandPalette.empty}
            </div>
          ) : (
            <>
              {renderGroup(
                strings.commandPalette.sectionPages,
                filteredPages,
                0,
              )}
              {renderGroup(
                strings.commandPalette.sectionCreate,
                filteredCreate,
                filteredPages.length,
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
