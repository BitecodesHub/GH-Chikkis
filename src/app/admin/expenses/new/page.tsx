import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ExpenseEntry } from "@/components/admin/expense-entry";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { expenseCategories } from "@/lib/expenses";
import { listInventoryItems } from "@/lib/inventory";
import { businessToday } from "@/lib/dates";
import { createExpenseAction, recordStockPurchaseAction } from "../actions";

export const metadata: Metadata = { title: "Record expense" };

export default async function NewExpensePage() {
  const { user } = await requirePermission("expenses.manage");
  const [categories, items] = await Promise.all([
    expenseCategories(),
    hasPermission(user, "inventory.manage")
      ? listInventoryItems({})
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Expenses"
        title="Record expense"
        description="Tap what came into the kitchen to keep stock and cost linked, or record any other cost."
        actions={
          <Link href="/admin/expenses" className="btn btn-outline btn-sm">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to expenses
          </Link>
        }
      />
      <ExpenseEntry
        items={items.map((item) => ({
          id: item.id,
          name: item.name,
          unit: item.unit,
          category: item.category,
          currentQuantity: item.currentQuantity,
        }))}
        categories={categories}
        today={businessToday()}
        canRecordStock={hasPermission(user, "inventory.manage")}
        purchaseAction={recordStockPurchaseAction}
        otherAction={createExpenseAction}
      />
    </div>
  );
}
