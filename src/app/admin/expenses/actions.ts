"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { ExpenseError, createExpense } from "@/lib/expenses";
import { InventoryError, parseInventoryQuantity, recordPurchase } from "@/lib/inventory";
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

// A raw-material or packaging buy recorded from the expense desk: the same
// write Inventory does, so stock and its expense stay one linked pair.
export async function recordStockPurchaseAction(
  _previous: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const { user } = await requirePermission("expenses.manage");
  if (!hasPermission(user, "inventory.manage")) {
    return {
      ok: false,
      message: "Stock purchases need the inventory permission. Use Other expense instead.",
    };
  }
  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) return { ok: false, message: "Choose what was bought." };
  const quantity = parseInventoryQuantity(formData.get("quantity"));
  if (quantity === null) {
    return {
      ok: false,
      message: "Enter the quantity bought, greater than zero, with up to three decimals.",
      errors: { quantity: "Enter a quantity above zero." },
    };
  }
  const amountPaise = parseRupeesToPaise(String(formData.get("amount") ?? ""));
  if (amountPaise === null || amountPaise <= 0) {
    return {
      ok: false,
      message: "Enter the amount paid in rupees.",
      errors: { amount: "Enter an amount greater than zero." },
    };
  }
  try {
    await recordPurchase(
      itemId,
      {
        quantity,
        date: String(formData.get("date") ?? ""),
        amountPaise,
        category: String(formData.get("category") ?? ""),
        supplier: String(formData.get("supplier") ?? ""),
        receiptRef: String(formData.get("receiptRef") ?? ""),
        paymentMethod: readPaymentMethod(formData.get("paymentMethod")),
        notes: String(formData.get("notes") ?? ""),
      },
      { id: user.id, name: user.name, email: user.email },
    );
  } catch (error) {
    if (error instanceof InventoryError || error instanceof ExpenseError) {
      return {
        ok: false,
        message: error.message,
        errors: error.field ? { [error.field]: error.message } : undefined,
      };
    }
    throw error;
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/expenses");
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
  redirect("/admin/expenses?created=1");
}
