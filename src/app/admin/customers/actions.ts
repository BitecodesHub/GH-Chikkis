"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import {
  CustomerError,
  createCustomer,
  setCustomerArchived,
  updateCustomer,
} from "@/lib/customers";
import { MessagingError, setWhatsAppConsent } from "@/lib/messaging";

export interface CustomerFormState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  existingId?: string;
}

export async function saveCustomerAction(
  _previous: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const { user } = await requirePermission("customers.manage");
  const intent = formData.get("intent") === "edit" ? "edit" : "create";
  const customerId = String(formData.get("customerId") ?? "");
  const actor = { id: user.id, name: user.name, email: user.email };

  const input = {
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    company: String(formData.get("company") ?? ""),
    gstin: String(formData.get("gstin") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    archived: formData.get("archived") === "on",
  };

  let savedId: string;
  try {
    if (intent === "edit") {
      if (!customerId) {
        return { ok: false, message: "That customer could not be identified." };
      }
      const customer = await updateCustomer(customerId, input, actor);
      savedId = customer.id;
    } else {
      const customer = await createCustomer(input, actor);
      savedId = customer.id;
    }
  } catch (error) {
    if (error instanceof CustomerError) {
      return {
        ok: false,
        message: error.message,
        errors: error.field ? { [error.field]: error.message } : undefined,
        existingId: error.existingId,
      };
    }
    throw error;
  }

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${savedId}`);

  const next = String(formData.get("next") ?? "");
  if (intent === "create" && next.startsWith("/admin/") && !next.startsWith("//")) {
    const separator = next.includes("?") ? "&" : "?";
    redirect(`${next}${separator}customerId=${savedId}`);
  }

  redirect(
    intent === "edit"
      ? `/admin/customers/${savedId}?saved=1`
      : `/admin/customers/${savedId}?created=1`,
  );
}

export async function setCustomerArchivedAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("customers.manage");
  const customerId = String(formData.get("customerId") ?? "");
  const archived = formData.get("archived") === "1";
  if (!customerId) redirect("/admin/customers");

  await setCustomerArchived(customerId, archived, {
    id: user.id,
    name: user.name,
    email: user.email,
  });
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${customerId}`);
  redirect(`/admin/customers/${customerId}?${archived ? "archived=1" : "restored=1"}`);
}

export async function setConsentAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("messaging.manage");
  const customerId = String(formData.get("customerId") ?? "");
  if (!customerId) redirect("/admin/customers");
  const state = formData.get("state") === "WITHDRAWN" ? "WITHDRAWN" : "GRANTED";
  try {
    await setWhatsAppConsent({
      customerId,
      state,
      source: String(formData.get("source") ?? ""),
      note: String(formData.get("note") ?? ""),
      actor: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    if (error instanceof MessagingError) {
      redirect(
        `/admin/customers/${customerId}?error=${encodeURIComponent(error.message)}`,
      );
    }
    throw error;
  }
  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath("/admin/customers");
  revalidatePath("/admin/whatsapp");
  revalidatePath("/admin/orders");
  redirect(`/admin/customers/${customerId}?consent=${state.toLowerCase()}`);
}
