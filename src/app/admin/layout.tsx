import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Workspace", template: "%s — GH Chikkis" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user, idleExpiresAt } = await requireUser();
  return (
    <AdminShell user={user} idleExpiresAt={idleExpiresAt}>
      {children}
    </AdminShell>
  );
}
