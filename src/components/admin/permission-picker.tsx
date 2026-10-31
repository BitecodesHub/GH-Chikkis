import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  type Permission,
} from "@/lib/types";

export function PermissionPicker({
  allowed,
  selected,
  idPrefix,
}: {
  allowed: Permission[];
  selected: Permission[];
  idPrefix: string;
}) {
  const allowedSet = new Set(allowed);
  return (
    <div className="space-y-5">
      {PERMISSION_GROUPS.map((group) => {
        const permissions = group.permissions.filter((permission) =>
          allowedSet.has(permission),
        );
        if (permissions.length === 0) return null;
        return (
          <fieldset key={group.label}>
            <legend className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              {group.label}
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {permissions.map((permission) => (
                <label
                  key={permission}
                  className="flex items-start gap-2.5 border border-line bg-paper-raised px-3 py-2.5 text-[0.875rem]"
                  htmlFor={`${idPrefix}-${permission}`}
                >
                  <input
                    id={`${idPrefix}-${permission}`}
                    type="checkbox"
                    name="permissions"
                    value={permission}
                    defaultChecked={selected.includes(permission)}
                    className="mt-0.5"
                  />
                  <span>{PERMISSION_LABELS[permission]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
