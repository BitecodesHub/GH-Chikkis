"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { ExpenseError } from "@/lib/expenses";
import {
  InventoryError,
  createInventoryItem,
  parseInventoryQuantity,
  recordAdjustment,
  recordPurchase,
  recordUsage,
  updateInventoryItem,
} from "@/lib/inventory";
import { parseRupeesToPaise } from "@/lib/money";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/types";

export interface InventoryFormState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
}

function actorFrom(user: { id: string; name: string; email: string }) {
  return { id: user.id, name: user.name, email: user.email };
}

function failure(error: unknown): InventoryFormState {
  if (error instanceof InventoryError) {
    return {
      ok: false,
      message: error.message,
      errors: error.field ? { [error.field]: error.message } : undefined,
    };
  }
  if (error instanceof ExpenseError) {
    return {
      ok: false,
      message: error.message,
      errors: error.field ? { [error.field]: error.message } : undefined,
    };
  }
  throw error;
}

function readPaymentMethod(value: FormDataEntryValue | null): PaymentMethod | null {
  const text = String(value ?? "");
  return PAYMENT_METHODS.some((method) => method.value === text)
    ? (text as PaymentMethod)
    : null;
}

function revalidateInventory(itemId?: string) {
  revalidatePath("/admin/inventory");
  if (itemId) revalidatePath(`/admin/inventory/${itemId}`);
  revalidatePath("/admin/expenses");
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
}

export async function createInventoryItemAction(
  _previous: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const { user } = await requirePermission("inventory.manage");
  const openingRaw = String(formData.get("openingQuantity") ?? "").trim();
  const opening = openingRaw ? parseInventoryQuantity(openingRaw, { allowZero: true }) : 0;
  if (opening === null) {
    return {
      ok: false,
      message: "Opening stock must be zero or a positive number with up to three decimals.",
      errors: { openingQuantity: "Enter zero or a positive number." },
    };
  }
  let itemId = "";
  try {
    const item = await createInventoryItem(
      {
        name: String(formData.get("name") ?? ""),
        category: String(formData.get("category") ?? ""),
        unit: String(formData.get("unit") ?? ""),
        openingQuantity: opening,
      },
      actorFrom(user),
    );
    itemId = item.id;
  } catch (error) {
    return failure(error);
  }
  revalidateInventory(itemId);
  redirect(`/admin/inventory/${itemId}?created=1`);
}

export async function updateInventoryItemAction(
  _previous: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const { user } = await requirePermission("inventory.manage");
  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) return { ok: false, message: "That inventory item could not be identified." };
  try {
    await updateInventoryItem(
      itemId,
      {
        name: String(formData.get("name") ?? ""),
        category: String(formData.get("category") ?? ""),
        unit: String(formData.get("unit") ?? ""),
        active: formData.get("active") === "on",
      },
      actorFrom(user),
    );
  } catch (error) {
    return failure(error);
  }
  revalidateInventory(itemId);
  return { ok: true, message: "Item details saved." };
}

export async function recordPurchaseAction(
  _previous: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const { user } = await requirePermission("inventory.manage");
  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) return { ok: false, message: "That inventory item could not be identified." };
  const quantity = parseInventoryQuantity(formData.get("quantity"));
  if (quantity === null) {
    return {
      ok: false,
      message: "Enter the quantity purchased, greater than zero, with up to three decimals.",
      errors: { quantity: "Enter a positive quantity." },
    };
  }
  const amountPaise = parseRupeesToPaise(String(formData.get("amount") ?? ""));
  if (amountPaise === null || amountPaise <= 0) {
    return {
      ok: false,
      message: "Enter the purchase amount in rupees.",
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
      actorFrom(user),
    );
  } catch (error) {
    return failure(error);
  }
  revalidateInventory(itemId);
  return { ok: true, message: "Purchase recorded, stock updated and an expense created." };
}

export async function recordUsageAction(
  _previous: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const { user } = await requirePermission("inventory.manage");
  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) return { ok: false, message: "That inventory item could not be identified." };
  const quantity = parseInventoryQuantity(formData.get("quantity"));
  if (quantity === null) {
    return {
      ok: false,
      message: "Enter the quantity used, greater than zero, with up to three decimals.",
      errors: { quantity: "Enter a positive quantity." },
    };
  }
  try {
    await recordUsage(
      itemId,
      {
        quantity,
        date: String(formData.get("date") ?? ""),
        notes: String(formData.get("notes") ?? ""),
      },
      actorFrom(user),
    );
  } catch (error) {
    return failure(error);
  }
  revalidateInventory(itemId);
  return { ok: true, message: "Usage recorded. No expense was created for this movement." };
}

export async function recordAdjustmentAction(
  _previous: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  const { user } = await requirePermission("inventory.manage");
  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) return { ok: false, message: "That inventory item could not be identified." };
  const counted = parseInventoryQuantity(formData.get("countedQuantity"), { allowZero: true });
  if (counted === null) {
    return {
      ok: false,
      message: "Enter the counted quantity, zero or more, with up to three decimals.",
      errors: { countedQuantity: "Enter zero or a positive number." },
    };
  }
  try {
    await recordAdjustment(
      itemId,
      {
        countedQuantity: counted,
        date: String(formData.get("date") ?? ""),
        reason: String(formData.get("reason") ?? ""),
      },
      actorFrom(user),
    );
  } catch (error) {
    return failure(error);
  }
  revalidateInventory(itemId);
  return { ok: true, message: "Stock adjustment saved with a reason in the movement history." };
}
