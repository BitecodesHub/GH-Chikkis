"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  Boxes,
  DatabaseBackup,
  ExternalLink,
  FileText,
  History,
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Package,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Upload,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Wordmark } from "@/components/site/wordmark";
import { Diamond } from "@/components/ui/diamond";
import { cn } from "@/lib/cn";
import { hasPermission } from "@/lib/permissions";
import type { Permission, User } from "@/lib/types";
import { SessionGuard } from "./session-guard";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
  exact?: boolean;
  soon?: boolean;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
      { label: "Alerts", href: "/admin/alerts", icon: Bell },
    ],
  },
  {
    label: "Sales",
    items: [
      {
        label: "Enquiries",
        href: "/admin/enquiries",
        icon: Inbox,
        permission: "enquiries.manage",
      },
      {
        label: "Orders",
        href: "/admin/orders",
        icon: ShoppingBag,
        permission: "orders.view",
      },
      {
        label: "Customers",
        href: "/admin/customers",
        icon: Users,
        permission: "customers.view",
      },
    ],
  },
  {
    label: "Catalogue",
    items: [
      {
        label: "Products",
        href: "/admin/products",
        icon: Package,
        permission: "catalogue.manage",
      },
      {
        label: "Website content",
        href: "/admin/content",
        icon: FileText,
        permission: "content.edit",
      },
      {
        label: "Inventory",
        href: "/admin/inventory",
        icon: Boxes,
        permission: "inventory.manage",
      },
    ],
  },
  {
    label: "Money",
    items: [
      {
        label: "Expenses",
        href: "/admin/expenses",
        icon: ReceiptText,
        permission: "expenses.manage",
      },
      {
        label: "Reports",
        href: "/admin/reports",
        icon: BarChart3,
        permission: "reports.view",
      },
    ],
  },
  {
    label: "Communication",
    items: [
      {
        label: "WhatsApp",
        href: "/admin/whatsapp",
        icon: MessageCircle,
        permission: "messaging.manage",
      },
      {
        label: "Emails",
        href: "/admin/emails",
        icon: Mail,
        permission: "messaging.manage",
      },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        label: "Users & access",
        href: "/admin/users",
        icon: ShieldCheck,
        permission: "users.manage",
      },
      {
        label: "Settings",
        href: "/admin/settings",
        icon: Settings,
        permission: "settings.manage",
      },
      {
        label: "Audit log",
        href: "/admin/audit",
        icon: History,
        permission: "audit.view",
      },
      {
        label: "Backups",
        href: "/admin/backups",
        icon: DatabaseBackup,
        permission: "backups.manage",
      },
      {
        label: "Imports",
        href: "/admin/imports",
        icon: Upload,
        permission: "customers.manage",
      },
    ],
  },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function NavContent({
  user,
  pathname,
  onNavigate,
  onSignOut,
}: {
  user: User;
  pathname: string;
  onNavigate?: () => void;
  onSignOut?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6 pb-5">
        <Wordmark
          tone="paper"
          href="/admin"
          label="GH Chikkis workspace"
        />
        <p className="mt-4 flex items-center gap-2 text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-paper/40">
          <Diamond size="sm" className="border-brass" />
          Workspace
        </p>
      </div>

      <nav aria-label="Workspace" className="no-scrollbar flex-1 overflow-y-auto px-3 pb-6">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter(
            (item) => !item.permission || hasPermission(user, item.permission),
          );
          if (items.length === 0) return null;
          return (
            <div key={group.label} className="mt-5 first:mt-0">
              <p className="px-3 text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-paper/35">
                {group.label}
              </p>
              <ul className="mt-2 space-y-0.5">
                {items.map((item) => {
                  const active = item.exact
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  if (item.soon) {
                    return (
                      <li key={item.href}>
                        <span
                          aria-disabled="true"
                          className="flex cursor-not-allowed items-center gap-3 rounded-sm px-3 py-2 text-[0.875rem] text-paper/35"
                        >
                          <Icon aria-hidden="true" className="size-4" />
                          <span className="flex-1">{item.label}</span>
                          <span className="rounded-full border border-paper/15 px-1.5 py-0.5 text-[0.5625rem] uppercase tracking-[0.1em]">
                            Soon
                          </span>
                        </span>
                      </li>
                    );
                  }
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-sm px-3 py-2 text-[0.875rem] transition-colors",
                          active
                            ? "bg-paper/10 text-paper"
                            : "text-paper/65 hover:bg-paper/5 hover:text-paper",
                        )}
                      >
                        <Icon aria-hidden="true" className="size-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-paper/10 p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full border border-paper/20 text-[0.75rem] font-semibold text-paper/80">
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.875rem] font-medium text-paper">{user.name}</p>
            <p className="truncate text-[0.75rem] text-paper/45">{user.email}</p>
          </div>
        </div>
        <form action="/api/auth/logout" method="post" onSubmit={onSignOut}>
          <button
            type="submit"
            className="mt-3 flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-[0.8125rem] text-paper/55 transition-colors hover:bg-paper/5 hover:text-paper"
          >
            <LogOut aria-hidden="true" className="size-4" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

export function AdminShell({
  user,
  idleExpiresAt,
  children,
}: {
  user: User;
  idleExpiresAt: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className="min-h-dvh bg-paper">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-olive-deep lg:block">
        <NavContent user={user} pathname={pathname} />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-paper px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="btn btn-quiet -ml-2 px-2 lg:hidden"
            aria-label="Open workspace menu"
            aria-expanded={menuOpen}
          >
            <Menu aria-hidden="true" className="size-5" />
          </button>

          <div className="lg:hidden">
            <Wordmark tone="ink" />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 text-[0.8125rem] text-ink-soft transition-colors hover:text-ink sm:flex"
            >
              View site
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </a>
            <span className="hidden h-5 w-px bg-line sm:block" />
            <span className="grid size-8 place-items-center rounded-full border border-line-strong text-[0.6875rem] font-semibold text-ink-soft">
              {initials(user.name)}
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close workspace menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-ink/50"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Workspace navigation"
            className="absolute inset-y-0 left-0 w-[17rem] max-w-[85vw] bg-olive-deep"
          >
            <button
              type="button"
              autoFocus
              onClick={() => setMenuOpen(false)}
              className="absolute top-4 right-3 z-10 grid size-9 place-items-center rounded-sm text-paper/60 hover:bg-paper/10 hover:text-paper"
              aria-label="Close menu"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
            <NavContent
              user={user}
              pathname={pathname}
              onNavigate={() => setMenuOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <SessionGuard idleExpiresAt={idleExpiresAt} />
    </div>
  );
}
