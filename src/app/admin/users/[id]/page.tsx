import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, KeyRound, Save, ShieldCheck } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { PermissionPicker } from "@/components/admin/permission-picker";
import { requirePermission } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/dates";
import { assignablePermissions } from "@/lib/permissions";
import { getUserById } from "@/lib/users";
import { revokeSessionsAction, updateUserAction } from "../actions";

export const metadata: Metadata = { title: "Edit access" };

function Notice({ params }: { params: Record<string, string | string[] | undefined> }) {
  const error = typeof params.error === "string" ? params.error : "";
  if (error) {
    return (
      <p role="alert" className="border border-terracotta bg-paper-raised px-4 py-3 text-[0.875rem] text-terracotta">
        {error}
      </p>
    );
  }
  if (params.saved === "1") {
    return (
      <p role="status" className="border border-olive bg-paper-raised px-4 py-3 text-[0.875rem]">
        Access updated. Permission checks take effect on the next request.
      </p>
    );
  }
  if (params.revoked === "1") {
    return (
      <p role="status" className="border border-olive bg-paper-raised px-4 py-3 text-[0.875rem]">
        All active sessions for this person have been signed out.
      </p>
    );
  }
  return null;
}

export default async function EditUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("users.manage");
  const { id } = await params;
  const notices = await searchParams;
  const target = await getUserById(id);
  if (!target) notFound();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Users & access"
        title={target.name}
        description={target.email}
        actions={
          <Link href="/admin/users" className="btn btn-quiet btn-sm">
            <ArrowLeft aria-hidden="true" className="size-4" />
            All users
          </Link>
        }
      />

      <Notice params={notices} />

      {target.role === "OWNER" ? (
        <section className="surface flex items-start gap-3 p-5">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 text-olive" />
          <div>
            <h2 className="font-medium">Owner access is fixed.</h2>
            <p className="mt-1 text-[0.875rem] text-ink-soft">
              This account always has full access. To change which Google account is the Owner,
              update <code>OWNER_EMAIL</code> in the environment and restart the app.
            </p>
          </div>
        </section>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="surface p-5 sm:p-6" aria-labelledby="access-form">
            <h2 id="access-form" className="font-[family-name:var(--font-display)] text-xl">
              Access
            </h2>
            <p className="mt-2 text-[0.875rem] text-ink-soft">
              Last sign-in:{" "}
              {target.lastSignInAt ? formatDateTime(target.lastSignInAt) : "never"}.
            </p>
            <form action={updateUserAction} className="mt-5 space-y-6">
              <input type="hidden" name="id" value={target._id} />
              <div>
                <label htmlFor="edit-user-name" className="label">
                  Name
                </label>
                <input
                  id="edit-user-name"
                  name="name"
                  defaultValue={target.name}
                  required
                  maxLength={120}
                  className="field"
                />
              </div>
              <label className="flex items-start gap-3 border border-line bg-paper-raised px-4 py-3 text-[0.875rem]">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={target.active}
                  className="mt-0.5"
                />
                <span>
                  <span className="block font-medium">Account is active</span>
                  <span className="text-ink-muted">
                    Turning this off blocks sign-in and immediately signs out their open sessions.
                  </span>
                </span>
              </label>
              <PermissionPicker
                allowed={assignablePermissions("TEAM")}
                selected={target.permissions}
                idPrefix={`edit-${target._id}`}
              />
              <button type="submit" className="btn btn-solid">
                <Save aria-hidden="true" className="size-4" />
                Save access
              </button>
            </form>
          </section>

          <section className="surface p-5" aria-labelledby="session-context">
            <h2 id="session-context" className="flex items-center gap-2 font-medium">
              <KeyRound aria-hidden="true" className="size-4 text-brass" />
              Sessions
            </h2>
            <p className="mt-2 text-[0.875rem] text-ink-soft">
              Sign out every device if this person&apos;s access may have been compromised. They can
              sign in again with Google.
            </p>
            <form action={revokeSessionsAction} className="mt-4">
              <input type="hidden" name="id" value={target._id} />
              <button type="submit" className="btn btn-outline btn-sm">
                Revoke active sessions
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
