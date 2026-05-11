"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { MoreHorizontal, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { useCommandPalette } from "./command-palette";
import {
  allNavItems,
  globalActions,
  navGroups,
  type NavItem,
} from "./nav-config";

function isActive(currentPath: string, href: string) {
  if (href === "/dashboard") {
    return currentPath === "/dashboard" || currentPath === "/";
  }
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function MobileNavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm leading-6 transition-colors",
        active
          ? "bg-primary/10 font-medium text-primary"
          : "text-foreground hover:bg-muted",
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

const BOTTOM_BAR_HREFS = ["/dashboard", "/pain-book", "/flare", "/log-book"];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const { setOpen: setCommandOpen } = useCommandPalette();

  const bottomItems = BOTTOM_BAR_HREFS.map((href) =>
    allNavItems.find((item) => item.href === href),
  ).filter((item): item is NavItem => Boolean(item));

  return (
    <>
      <header className="sticky top-0 z-30 flex min-h-[calc(3rem+var(--safe-top))] items-center justify-between gap-2 border-b border-border bg-background/95 pb-0 pl-[max(var(--safe-left),0.75rem)] pr-[max(var(--safe-right),0.75rem)] pt-[var(--safe-top)] backdrop-blur lg:hidden">
        <span className="text-sm font-semibold">{strings.app.name}</span>
        <div className="flex items-center gap-1.5">
          {globalActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.href}
                asChild
                size="sm"
                variant={action.kind === "primary" ? "default" : "outline"}
                className="gap-1.5"
              >
                <Link href={action.href} aria-label={action.label}>
                  <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                  <span
                    className={cn(
                      action.kind === "primary" ? "" : "hidden sm:inline",
                    )}
                  >
                    {action.label}
                  </span>
                </Link>
              </Button>
            );
          })}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={strings.commandPalette.openSearch}
            onClick={() => setCommandOpen(true)}
          >
            <Search aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <nav
        aria-label={strings.nav.primary}
        className="fixed bottom-0 left-0 right-0 z-30 grid min-h-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom))] grid-cols-5 border-t border-border bg-background/95 pb-[var(--safe-bottom)] pl-[var(--safe-left)] pr-[var(--safe-right)] backdrop-blur lg:hidden"
      >
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          const isFlare = item.href === "/flare";
          if (isFlare) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] leading-tight text-foreground transition-colors"
              >
                <span className="-mt-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] leading-tight transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label={strings.nav.openMenu}
              className="flex flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] leading-tight text-muted-foreground transition-colors hover:text-foreground"
            >
              <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
              <span className="truncate">{strings.nav.more}</span>
            </button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-72 p-0 pb-[var(--safe-bottom)] pr-[var(--safe-right)] pt-[var(--safe-top)]"
          >
            <SheetHeader>
              <SheetTitle>{strings.app.name}</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-3 px-3 pb-4">
              {navGroups.map((group) => {
                const visibleItems = group.items.filter((item) => !item.stub);
                if (visibleItems.length === 0) return null;
                return (
                  <div key={group.id}>
                    <div className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {visibleItems.map((item) => (
                        <MobileNavLink
                          key={item.href}
                          item={item}
                          active={isActive(pathname, item.href)}
                          onNavigate={() => setOpen(false)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  );
}
