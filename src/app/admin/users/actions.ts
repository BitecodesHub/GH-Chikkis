"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import {
  createTeamUser,
  getUserById,
  revokeSessionsForUser,
  updateUserAccess,
  type UserDoc,
} from "@/lib/users";
import { cleanSingleLine } from "@/lib/text";

function fail(message: string, id?: string): never {
  const path = id ? `/admin/users/${id}` : "/admin/users";
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function permissionsFrom(formData: FormData): string[] {
  return formData.getAll("permissions").map(String);
}

export async function createUserAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("users.manage");
  const email = String(formData.get("email") ?? "");
  const name = cleanSingleLine(String(formData.get("name") ?? ""), 120);
  if (!name) fail("Enter a name for this team member.");
  try {
    const created = await createTeamUser({
      email,
      name,
      role: "TEAM",
      permissions: permissionsFrom(formData),
    });
    await recordAudit({
      actor: { id: user.id, email: user.email },
      action: "user.create",
      entityType: "user",
      entityId: created._id,
      summary: `Created team access for ${created.name} (${created.email})`,
    });
  } catch (error) {
    if (error instanceof Error) fail(error.message);
    throw error;
  }
  revalidatePath("/admin/users");
  redirect("/admin/users?created=1");
}

export async function updateUserAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("users.manage");
  const id = String(formData.get("id") ?? "");
  const target = await getUserById(id);
  if (!target) fail("That user could not be found.");
  if (target.role === "OWNER") {
    fail("Owner access cannot be edited. It is granted from the OWNER_EMAIL configuration.", id);
  }
  const active = formData.get("active") === "on";
  if (id === user.id && !active) {
    fail("You cannot deactivate your own account.", id);
  }
  const permissions = permissionsFrom(formData);
  const name = cleanSingleLine(String(formData.get("name") ?? ""), 120);
  let updated: UserDoc | null = null;
  try {
    updated = await updateUserAccess(id, {
      name: name || target.name,
      role: "TEAM",
      permissions,
      active,
    });
  } catch (error) {
    if (error instanceof Error) fail(error.message, id);
    throw error;
  }
  if (!updated) fail("That user could not be saved.", id);
  if (!active) {
    await revokeSessionsForUser(id);
  }
  await recordAudit({
    actor: { id: user.id, email: user.email },
    action: "user.update",
    entityType: "user",
    entityId: id,
    summary: `Updated access for ${target.name} · ${active ? "active" : "inactive"} · ${
      permissions.length
    } permission(s)${!active ? " · sessions revoked" : ""}`,
    diff: [
      {
        field: "active",
        from: String(target.active),
        to: String(active),
      },
      {
        field: "permissions",
        from: target.permissions.join(", "),
        to: permissions.join(", "),
      },
    ],
  });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
  redirect(`/admin/users/${id}?saved=1`);
}

export async function revokeSessionsAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("users.manage");
  const id = String(formData.get("id") ?? "");
  const target = await getUserById(id);
  if (!target) fail("That user could not be found.");
  await revokeSessionsForUser(id);
  await recordAudit({
    actor: { id: user.id, email: user.email },
    action: "user.sessions.revoke",
    entityType: "user",
    entityId: id,
    summary: `Revoked active sessions for ${target.name}`,
  });
  revalidatePath(`/admin/users/${id}`);
  redirect(`/admin/users/${id}?revoked=1`);
}
