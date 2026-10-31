"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { ExpenseError, createExpense } from "@/lib/expenses";
import { parseRupeesToPaise } from "@/lib/money";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/types";

export interface ExpenseFormState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
}

function readPaymentMethod(value: FormDataEntryValue | null): PaymentMethod | null {
  const text = String(value ?? "");
  return PAYMENT_METHODS.some((method) => method.value === text)
    ? (text as PaymentMethod)
    : null;
}

export async function createExpenseAction(
  _previous: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const { user } = await requirePermission("expenses.manage");
  const amountPaise = parseRupeesToPaise(String(formData.get("amount") ?? ""));
  if (amountPaise === null || amountPaise <= 0) {
    return {
      ok: false,
      message: "Enter an amount greater than zero.",
      errors: { amount: "Enter the amount in rupees." },
    };
  }

  try {
    await createExpense(
      {
        date: String(formData.get("date") ?? ""),
        amountPaise,
        category: String(formData.get("category") ?? ""),
        description: String(formData.get("description") ?? ""),
        supplier: String(formData.get("supplier") ?? ""),
        receiptRef: String(formData.get("receiptRef") ?? ""),
        paymentMethod: readPaymentMethod(formData.get("paymentMethod")),
      },
      { id: user.id, name: user.name, email: user.email },
    );
  } catch (error) {
    if (error instanceof ExpenseError) {
      return {
        ok: false,
        message: error.message,
        errors: error.field ? { [error.field]: error.message } : undefined,
      };
    }
    throw error;
  }

  revalidatePath("/admin/expenses");
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
  redirect("/admin/expenses?created=1");
}
