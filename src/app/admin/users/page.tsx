import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, ShieldCheck, UserPlus, Users } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { PermissionPicker } from "@/components/admin/permission-picker";
import { requirePermission } from "@/lib/auth/session";
import { formatDateTime, relativeTime } from "@/lib/dates";
import { assignablePermissions } from "@/lib/permissions";
import { PERMISSION_LABELS } from "@/lib/types";
import { listUsers } from "@/lib/users";
import { createUserAction } from "./actions";

export const metadata: Metadata = { title: "Users & access" };

function Notice({ params }: { params: Record<string, string | string[] | undefined> }) {
  const error = typeof params.error === "string" ? params.error : "";
  if (error) {
    return (
      <p role="alert" className="border border-terracotta bg-paper-raised px-4 py-3 text-[0.875rem] text-terracotta">
        {error}
      </p>
    );
  }
  if (params.created === "1") {
    return (
      <p role="status" className="rounded-2xl border border-olive bg-paper-raised px-4 py-3 text-[0.875rem]">
        Team access created. They can now sign in with the password you set, or
        with Google if that email is approved.
      </p>
    );
  }
  return null;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("users.manage");
  const params = await searchParams;
  const users = await listUsers();
  const teamPermissions = assignablePermissions("TEAM");

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Admin"
        title="Users & access"
        description="Only people listed here can open the dashboard, and only with the permissions you grant. Everyone else stays out, whether they use a password or Google."
      />

      <Notice params={params} />

      <div className="grid items-start gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="surface" aria-labelledby="team-list">
          <div className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-4">
            <h2 id="team-list" className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl">
              <Users aria-hidden="true" className="size-4 text-brass" />
              Approved accounts
            </h2>
            <span className="meta">{users.length} total</span>
          </div>
          <ul className="divide-y divide-line">
            {users.map((member) => (
              <li key={member.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[0.9375rem] font-medium">{member.name}</p>
                      <span className="pill border-line text-ink-muted">
                        {member.role === "OWNER" ? "Owner" : "Team"}
                      </span>
                      {!member.active ? (
                        <span className="pill border-terracotta text-terracotta">Inactive</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[0.8125rem] text-ink-muted">{member.email}</p>
                    <p className="mt-1 text-[0.75rem] text-ink-muted">
                      {member.role === "OWNER"
                        ? "Full access to every area."
                        : member.permissions.length === 0
                          ? "No permissions assigned yet."
                          : member.permissions.map((p) => PERMISSION_LABELS[p]).join(" · ")}
                    </p>
                    <p className="mt-1 text-[0.75rem] text-ink-muted">
                      {member.lastSignInAt
                        ? `Last sign-in ${relativeTime(member.lastSignInAt)} · ${formatDateTime(member.lastSignInAt)}`
                        : "Has not signed in yet."}
                    </p>
                  </div>
                  {member.role === "TEAM" ? (
                    <Link href={`/admin/users/${member.id}`} className="btn btn-outline btn-sm">
                      <KeyRound aria-hidden="true" className="size-3.5" />
                      Edit access
                    </Link>
                  ) : (
                    <span className="pill border-olive-soft text-olive">
                      <ShieldCheck aria-hidden="true" className="size-3.5" />
                      Protected
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-5 py-3 text-[0.75rem] text-ink-muted">
            The Owner account comes from the <code>OWNER_EMAIL</code> environment variable. It
            always has full access and cannot be reduced here.
          </p>
        </section>

        <section className="surface p-5 sm:p-6" aria-labelledby="add-team-member">
          <h2 id="add-team-member" className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl">
            <UserPlus aria-hidden="true" className="size-4 text-brass" />
            Add a team member
          </h2>
          <p className="mt-2 text-[0.875rem] text-ink-soft">
            Grant only what their work needs; you can change it later. They can
            sign in with a password, with Google, or both.
          </p>
          <form action={createUserAction} className="mt-5 space-y-4">
            <div>
              <label htmlFor="user-name" className="label">
                Name
              </label>
              <input id="user-name" name="name" required maxLength={120} className="field" />
            </div>
            <div>
              <label htmlFor="user-email" className="label">
                Email
              </label>
              <input
                id="user-email"
                name="email"
                type="email"
                required
                autoComplete="off"
                className="field"
              />
            </div>
            <div>
              <label htmlFor="user-password" className="label">
                Password <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <input
                id="user-password"
                name="password"
                type="text"
                minLength={8}
                autoComplete="off"
                placeholder="Leave empty for Google-only sign-in"
                className="field"
              />
              <p className="help">
                At least 8 characters. Share it with them directly — it is shown
                once and never stored as plain text.
              </p>
            </div>
            <PermissionPicker
              allowed={teamPermissions}
              selected={[]}
              idPrefix="new-user"
            />
            <button type="submit" className="btn btn-solid">
              <UserPlus aria-hidden="true" className="size-4" />
              Create access
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
