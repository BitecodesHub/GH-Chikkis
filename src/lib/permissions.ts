import {
  OWNER_ONLY_PERMISSIONS,
  PERMISSIONS,
  type Permission,
  type Role,
  type User,
} from "./types";

export function isOwner(user: Pick<User, "role">): boolean {
  return user.role === "OWNER";
}

export function hasPermission(
  user: Pick<User, "role" | "permissions" | "active"> | null | undefined,
  permission: Permission,
): boolean {
  if (!user || !user.active) return false;
  if (user.role === "OWNER") return true;
  return user.permissions.includes(permission);
}

export function hasAnyPermission(
  user: Pick<User, "role" | "permissions" | "active"> | null | undefined,
  permissions: Permission[],
): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}

export function assignablePermissions(role: Role): Permission[] {
  if (role === "OWNER") return [...PERMISSIONS];
  return PERMISSIONS.filter(
    (permission) => !OWNER_ONLY_PERMISSIONS.includes(permission),
  );
}

export function normalizePermissions(input: string[], role: Role): Permission[] {
  const allowed = new Set(assignablePermissions(role));
  return [...new Set(input)].filter((value): value is Permission =>
    allowed.has(value as Permission),
  );
}

export function canSeeMoney(user: Pick<User, "role" | "permissions" | "active">): boolean {
  return (
    hasPermission(user, "reports.view") ||
    hasPermission(user, "payments.manage") ||
    hasPermission(user, "expenses.manage")
  );
}

export function canSeeCustomerData(
  user: Pick<User, "role" | "permissions" | "active">,
): boolean {
  return hasPermission(user, "customers.view") || hasPermission(user, "orders.view");
}
