"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { useCommandPalette } from "./command-palette";
import { navGroups, type NavItem } from "./nav-config";

function isActive(currentPath: string, href: string) {
  if (href === "/dashboard") {
    return currentPath === "/dashboard" || currentPath === "/";
  }
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm leading-5 transition-colors",
        active
          ? "bg-primary/10 font-medium text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "h-4 w-4",
          active ? "text-primary" : "text-muted-foreground",
        )}
      />
      <span className="flex-1 truncate">{item.label}</span>
    </Link>
  );
}

export function DesktopNav() {
  const pathname = usePathname();
  const { setOpen } = useCommandPalette();
  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 hidden h-screen max-h-screen w-60 shrink-0 self-start flex-col border-r border-border bg-card lg:flex"
    >
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <span className="text-sm font-semibold">B</span>
        </div>
        <span className="text-sm font-semibold leading-tight">
          {strings.app.name}
        </span>
      </div>

      <div className="flex flex-col gap-2 px-3 pt-1">
        <Button asChild className="w-full justify-start gap-2" size="sm">
          <Link href="/flare">
            <Activity aria-hidden="true" className="h-4 w-4" />
            {strings.actions.startFlare}
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-between gap-2"
          onClick={() => setOpen(true)}
        >
          <span className="flex items-center gap-2">
            <Search aria-hidden="true" className="h-4 w-4" />
            {strings.commandPalette.triggerLabel}
          </span>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground">
            {strings.commandPalette.openShortcutLabel}
          </kbd>
        </Button>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto px-3 pb-4">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => !item.stub);
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.id} className="mt-3 first:mt-0">
              <div className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {group.label}
              </div>
              <div className="flex flex-col gap-0.5">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={isActive(pathname, item.href)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
