import { describe, expect, it } from "vitest";
import {
  assignablePermissions,
  canSeeCustomerData,
  canSeeMoney,
  hasAnyPermission,
  hasPermission,
  isOwner,
  normalizePermissions,
} from "./permissions";
import { OWNER_ONLY_PERMISSIONS, PERMISSIONS, type Permission, type User } from "./types";

type PermissionsUser = Pick<User, "role" | "permissions" | "active">;

function user(partial: Partial<PermissionsUser> = {}): PermissionsUser {
  return { role: "TEAM", permissions: [], active: true, ...partial };
}

describe("isOwner", () => {
  it("only recognises the OWNER role", () => {
    expect(isOwner({ role: "OWNER" })).toBe(true);
    expect(isOwner({ role: "TEAM" })).toBe(false);
  });
});

describe("hasPermission", () => {
  it("gives the owner everything, even with no permissions listed", () => {
    expect(hasPermission(user({ role: "OWNER" }), "settings.manage")).toBe(true);
  });

  it("denies a deactivated user even with the owner role", () => {
    expect(hasPermission(user({ role: "OWNER", active: false }), "orders.view")).toBe(false);
    expect(hasPermission(user({ active: false, permissions: ["orders.view"] }), "orders.view")).toBe(false);
  });

  it("denies missing users", () => {
    expect(hasPermission(null, "orders.view")).toBe(false);
    expect(hasPermission(undefined, "orders.view")).toBe(false);
  });

  it("checks the team member's granted list", () => {
    const team = user({ permissions: ["orders.view"] });
    expect(hasPermission(team, "orders.view")).toBe(true);
    expect(hasPermission(team, "orders.manage")).toBe(false);
  });
});

describe("hasAnyPermission", () => {
  it("passes on the first match", () => {
    const team = user({ permissions: ["reports.view"] });
    expect(hasAnyPermission(team, ["orders.view", "reports.view"])).toBe(true);
    expect(hasAnyPermission(team, ["orders.view", "expenses.manage"])).toBe(false);
    expect(hasAnyPermission(team, [])).toBe(false);
  });
});

describe("assignablePermissions", () => {
  it("offers the owner-only list to nobody but the owner", () => {
    const forTeam = assignablePermissions("TEAM");
    for (const permission of OWNER_ONLY_PERMISSIONS) {
      expect(forTeam).not.toContain(permission);
    }
    expect(forTeam).toHaveLength(PERMISSIONS.length - OWNER_ONLY_PERMISSIONS.length);
  });

  it("offers every permission to the owner", () => {
    expect(assignablePermissions("OWNER")).toEqual([...PERMISSIONS]);
  });
});

describe("normalizePermissions", () => {
  it("drops duplicates and anything the role may not hold", () => {
    const input = ["orders.view", "orders.view", "users.manage", "not.a.permission"];
    expect(normalizePermissions(input, "TEAM")).toEqual(["orders.view"]);
  });

  it("keeps owner-only permissions when the role is owner", () => {
    expect(normalizePermissions(["settings.manage", "orders.view"], "OWNER")).toEqual([
      "settings.manage",
      "orders.view",
    ]);
  });

  it("cannot be used to hand a team member an owner-only permission", () => {
    const sneaky: string[] = [...OWNER_ONLY_PERMISSIONS, PERMISSIONS[0]];
    const cleaned = normalizePermissions(sneaky, "TEAM");
    expect(cleaned).toEqual([PERMISSIONS[0]]);
    expect(cleaned.some((p) => OWNER_ONLY_PERMISSIONS.includes(p as Permission))).toBe(false);
  });
});

describe("canSeeMoney", () => {
  it("needs one of the three money permissions", () => {
    expect(canSeeMoney(user({ permissions: ["reports.view"] }))).toBe(true);
    expect(canSeeMoney(user({ permissions: ["payments.manage"] }))).toBe(true);
    expect(canSeeMoney(user({ permissions: ["expenses.manage"] }))).toBe(true);
    expect(canSeeMoney(user({ permissions: ["orders.view"] }))).toBe(false);
    expect(canSeeMoney(user({ role: "OWNER" }))).toBe(true);
  });
});

describe("canSeeCustomerData", () => {
  it("lets order viewers see customers", () => {
    expect(canSeeCustomerData(user({ permissions: ["orders.view"] }))).toBe(true);
    expect(canSeeCustomerData(user({ permissions: ["customers.view"] }))).toBe(true);
    expect(canSeeCustomerData(user({ permissions: ["inventory.manage"] }))).toBe(false);
  });
});
