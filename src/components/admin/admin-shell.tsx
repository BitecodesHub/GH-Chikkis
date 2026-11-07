"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  logoSrc,
  onNavigate,
  onSignOut,
}: {
  user: User;
  pathname: string;
  logoSrc?: string | null;
  onNavigate?: () => void;
  onSignOut?: () => void;
}) {
  const router = useRouter();
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6 pb-5">
        <Wordmark
          tone="paper"
          href="/admin"
          label="GH Chikkis workspace"
          logoSrc={logoSrc}
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
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        // The default warm-up only fetches the shared layout, so the
                        // click still waits for the page. Ask for the page on aim.
                        prefetch={false}
                        onPointerEnter={() => router.prefetch(item.href)}
                        onFocus={() => router.prefetch(item.href)}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2 text-[0.875rem] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
                          active
                            ? "bg-paper/14 text-paper shadow-[inset_0_1px_0_0_rgba(246,241,230,0.14)]"
                            : "text-paper/65 hover:translate-x-0.5 hover:bg-paper/8 hover:text-paper",
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
        <Link
          href="/"
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[0.8125rem] text-paper/55 transition-colors hover:bg-paper/8 hover:text-paper"
        >
          <ExternalLink aria-hidden="true" className="size-4" />
          View the website
        </Link>
        <form action="/api/auth/logout" method="post" onSubmit={onSignOut}>
          <button
            type="submit"
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[0.8125rem] text-paper/55 transition-colors hover:bg-paper/8 hover:text-paper"
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
  logoSrc,
  children,
}: {
  user: User;
  idleExpiresAt: string;
  logoSrc?: string | null;
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
    <div className="flex min-h-dvh bg-paper">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 p-3 lg:block">
        <div className="glass-deep flex h-full flex-col overflow-hidden rounded-[1.75rem]">
          <NavContent user={user} pathname={pathname} logoSrc={logoSrc} />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {user.usesDefaultPassword ? (
          <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border-2 border-terracotta bg-paper-raised px-4 py-3">
              <p className="text-[0.8125rem] leading-snug">
                <span className="font-semibold">
                  This account still uses the default password.
                </span>{" "}
                Change it before leaving the workspace open to the internet.
              </p>
              <Link
                href="/admin/settings#your-sign-in"
                className="btn btn-ink btn-sm ml-auto"
              >
                Change it now
              </Link>
            </div>
          </div>
        ) : null}

        <header className="sticky top-0 z-30 px-3 pt-3 sm:px-4 lg:hidden">
          <div className="glass flex h-14 items-center gap-3 rounded-full px-4">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="btn btn-quiet -ml-2 px-2"
              aria-label="Open workspace menu"
              aria-expanded={menuOpen}
            >
              <Menu aria-hidden="true" className="size-5" />
            </button>

            <Wordmark tone="ink" logoSrc={logoSrc} />

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
              <span className="grid size-8 place-items-center rounded-full border border-line-strong bg-white/60 text-[0.6875rem] font-semibold text-ink-soft">
                {initials(user.name)}
              </span>
            </div>
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
            className="glass-deep absolute inset-y-2 left-2 flex w-[17rem] max-w-[85vw] flex-col overflow-hidden rounded-[1.75rem] lg:hidden"
          >
            <button
              type="button"
              autoFocus
              onClick={() => setMenuOpen(false)}
              className="absolute top-4 right-3 z-10 grid size-9 place-items-center rounded-full text-paper/60 transition-colors hover:bg-paper/10 hover:text-paper"
              aria-label="Close menu"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
            <NavContent
              user={user}
              pathname={pathname}
              logoSrc={logoSrc}
              onNavigate={() => setMenuOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <SessionGuard idleExpiresAt={idleExpiresAt} />
    </div>
  );
}
