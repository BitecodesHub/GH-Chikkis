import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ExpenseForm } from "@/components/admin/expense-form";
import { requirePermission } from "@/lib/auth/session";
import { expenseCategories } from "@/lib/expenses";
import { businessToday } from "@/lib/dates";
import { createExpenseAction } from "../actions";

export const metadata: Metadata = { title: "Record expense" };

export default async function NewExpensePage() {
  await requirePermission("expenses.manage");
  const categories = await expenseCategories();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Expenses"
        title="Record expense"
        description="Labour, transport, utilities, marketing and other operating costs. Stock purchases belong in Inventory so stock and expense stay linked."
        actions={
          <Link href="/admin/expenses" className="btn btn-outline btn-sm">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to expenses
          </Link>
        }
      />
      <ExpenseForm categories={categories} today={businessToday()} action={createExpenseAction} />
    </div>
  );
}
