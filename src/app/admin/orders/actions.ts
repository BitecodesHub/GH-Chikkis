"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { parseRupeesToPaise } from "@/lib/money";
import {
  OrderError,
  addPayment,
  addRefund,
  changeOrderStatus,
  createOrder,
  updateOrder,
  type OrderInput,
  type OrderItemInput,
} from "@/lib/orders";
import {
  DELIVERY_METHODS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  type DeliveryMethod,
  type OrderStatus,
  type OrderType,
  type PaymentMethod,
  type WeightBasis,
} from "@/lib/types";

const DELIVERY_VALUES: DeliveryMethod[] = DELIVERY_METHODS.map((method) => method.value);
const PAYMENT_VALUES: PaymentMethod[] = PAYMENT_METHODS.map((method) => method.value);

export interface OrderFormState {
  ok: boolean;
  message?: string;
}

function parseItems(formData: FormData): OrderItemInput[] {
  const raw = formData.get("items");
  if (typeof raw !== "string" || raw.length > 200_000) {
    throw new OrderError("The order lines could not be read. Reload and try again.", "items");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new OrderError("The order lines could not be read. Reload and try again.", "items");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new OrderError("Add at least one product to the order.", "items");
  }
  if (parsed.length > 30) {
    throw new OrderError("An order can have at most 30 lines.", "items");
  }
  return parsed.map((rawItem): OrderItemInput => {
    const item = rawItem && typeof rawItem === "object" ? (rawItem as Record<string, unknown>) : {};
    return {
      productId: String(item.productId ?? ""),
      packagingId: item.packagingId ? String(item.packagingId) : null,
      actualWeightGrams: Math.round(Number(item.actualWeightGrams ?? 0)),
      weightBasis:
        item.weightBasis === "TOTAL" ? ("TOTAL" as WeightBasis) : ("PER_UNIT" as WeightBasis),
      quantity: Math.round(Number(item.quantity ?? 0)),
      ratePerGramPaise: Math.round(Number(item.ratePerGramPaise ?? 0)),
      adjustmentPaise: Math.round(Number(item.adjustmentPaise ?? 0)),
      notes: typeof item.notes === "string" ? item.notes : undefined,
    };
  });
}

function parseType(formData: FormData): OrderType {
  return formData.get("type") === "GIFT" ? "GIFT" : "SALES";
}

function parseDeliveryMethod(formData: FormData): DeliveryMethod {
  const value = String(formData.get("deliveryMethod") ?? "");
  return DELIVERY_VALUES.includes(value as DeliveryMethod)
    ? (value as DeliveryMethod)
    : "HOME_COLLECTION";
}

function parsePaymentMethod(formData: FormData, field = "method"): PaymentMethod {
  const value = String(formData.get(field) ?? "");
  return PAYMENT_VALUES.includes(value as PaymentMethod)
    ? (value as PaymentMethod)
    : "CASH";
}

function parseCharge(formData: FormData, field: string): number {
  const raw = String(formData.get(field) ?? "").trim();
  if (!raw) return 0;
  const paise = parseRupeesToPaise(raw);
  if (paise === null || paise < 0) {
    throw new OrderError("Enter a valid amount.", field);
  }
  return paise;
}

function actorFrom(user: { id: string; name: string; email: string }) {
  return { id: user.id, name: user.name, email: user.email };
}

function revalidateOrderPaths(orderId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/customers");
}

export async function saveOrderAction(
  _previous: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const { user } = await requirePermission("orders.manage");
  const orderId = String(formData.get("orderId") ?? "");
  const type = parseType(formData);
  const customerId = String(formData.get("customerId") ?? "");
  if (!customerId) {
    return { ok: false, message: "Choose a customer before saving the order." };
  }

  let input: OrderInput;
  try {
    const items = parseItems(formData);
    const deliveryCharge = type === "GIFT" ? 0 : parseCharge(formData, "deliveryCharge");
    const giftCost = parseCharge(formData, "giftCost");
    const expectedDate = String(formData.get("expectedDate") ?? "").trim();
    const initialRaw = String(formData.get("initialAmount") ?? "").trim();
    let initialPayment: OrderInput["initialPayment"];
    if (!orderId && type === "SALES" && initialRaw) {
      const amountPaise = parseRupeesToPaise(initialRaw);
      if (amountPaise === null || amountPaise <= 0) {
        throw new OrderError("Enter a valid initial payment amount.", "initialAmount");
      }
      initialPayment = {
        amountPaise,
        method: parsePaymentMethod(formData, "initialMethod"),
        date: String(formData.get("initialDate") ?? ""),
        reference: String(formData.get("initialReference") ?? ""),
        notes: String(formData.get("initialNotes") ?? ""),
      };
    }

    input = {
      type,
      customerId,
      items,
      orderDate: String(formData.get("orderDate") ?? ""),
      expectedDate: expectedDate || null,
      delivery: {
        method: parseDeliveryMethod(formData),
        chargePaise: deliveryCharge,
        notes: String(formData.get("deliveryNotes") ?? ""),
      },
      comments: String(formData.get("comments") ?? ""),
      ...(type === "GIFT"
        ? {
            gift: {
              costPaise: giftCost,
              treatment:
                formData.get("giftTreatment") === "ALREADY_RECORDED"
                  ? ("ALREADY_RECORDED" as const)
                  : ("NEW_EXPENSE" as const),
              note: String(formData.get("giftNote") ?? ""),
            },
          }
        : {}),
      enquiryId: String(formData.get("enquiryId") ?? "") || undefined,
      initialPayment,
      idempotencyKey: String(formData.get("idempotencyKey") ?? "") || randomUUID(),
    };
  } catch (error) {
    if (error instanceof OrderError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }

  try {
    const actor = actorFrom(user);
    if (orderId) {
      const order = await updateOrder(orderId, input, actor);
      revalidateOrderPaths(order.id);
      revalidatePath(`/admin/customers/${order.customerId ?? ""}`);
      redirect(`/admin/orders/${order.id}?saved=1`);
    }
    const order = await createOrder(input, actor);
    revalidateOrderPaths(order.id);
    revalidatePath(`/admin/customers/${order.customerId ?? ""}`);
    if (input.enquiryId) revalidatePath(`/admin/enquiries/${input.enquiryId}`);
    redirect(`/admin/orders/${order.id}?created=1`);
  } catch (error) {
    if (error instanceof OrderError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

export async function changeOrderStatusAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("orders.manage");
  const orderId = String(formData.get("orderId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!orderId) redirect("/admin/orders");
  if (!ORDER_STATUSES.includes(status as OrderStatus)) {
    redirect(`/admin/orders/${orderId}?error=${encodeURIComponent("Choose a valid status.")}`);
  }
  try {
    await changeOrderStatus(
      orderId,
      status as OrderStatus,
      String(formData.get("note") ?? ""),
      actorFrom(user),
    );
  } catch (error) {
    if (error instanceof OrderError) {
      redirect(`/admin/orders/${orderId}?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
  revalidateOrderPaths(orderId);
  redirect(`/admin/orders/${orderId}?status=1`);
}

export async function addPaymentAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("payments.manage");
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) redirect("/admin/orders");
  try {
    const amountPaise = parseRupeesToPaise(String(formData.get("amount") ?? ""));
    if (amountPaise === null) {
      throw new OrderError("Enter a payment amount.", "amount");
    }
    await addPayment(
      {
        orderId,
        amountPaise,
        method: parsePaymentMethod(formData, "method"),
        date: String(formData.get("date") ?? ""),
        reference: String(formData.get("reference") ?? ""),
        notes: String(formData.get("notes") ?? ""),
        idempotencyKey: String(formData.get("idempotencyKey") ?? "") || undefined,
      },
      actorFrom(user),
    );
  } catch (error) {
    if (error instanceof OrderError) {
      redirect(`/admin/orders/${orderId}?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
  revalidateOrderPaths(orderId);
  revalidatePath("/admin/orders");
  redirect(`/admin/orders/${orderId}?paid=1`);
}

export async function addRefundAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("payments.manage");
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) redirect("/admin/orders");
  try {
    const amountPaise = parseRupeesToPaise(String(formData.get("amount") ?? ""));
    if (amountPaise === null) {
      throw new OrderError("Enter a refund amount.", "amount");
    }
    await addRefund(
      {
        orderId,
        amountPaise,
        method: parsePaymentMethod(formData, "method"),
        date: String(formData.get("date") ?? ""),
        reason: String(formData.get("reason") ?? ""),
        idempotencyKey: String(formData.get("idempotencyKey") ?? "") || undefined,
      },
      actorFrom(user),
    );
  } catch (error) {
    if (error instanceof OrderError) {
      redirect(`/admin/orders/${orderId}?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
  revalidateOrderPaths(orderId);
  revalidatePath("/admin/orders");
  redirect(`/admin/orders/${orderId}?refunded=1`);
}
