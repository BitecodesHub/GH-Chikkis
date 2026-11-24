"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { deleteEnquiry, updateEnquiryNotes } from "@/lib/enquiries";

export async function updateEnquiryNotesAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("enquiries.manage");
  const enquiryId = String(formData.get("enquiryId") ?? "");
  if (!enquiryId) redirect("/admin/enquiries");

  try {
    await updateEnquiryNotes(enquiryId, String(formData.get("internalNotes") ?? ""), {
      id: user.id,
      name: user.name,
      email: user.email,
    });
  } catch {
    redirect(`/admin/enquiries/${enquiryId}?error=1`);
  }
  revalidatePath("/admin/enquiries");
  revalidatePath(`/admin/enquiries/${enquiryId}`);
  redirect(`/admin/enquiries/${enquiryId}?notes=1`);
}

export async function deleteEnquiryAction(id: string): Promise<{ ok: boolean; message?: string }> {
  const { user } = await requirePermission("enquiries.manage");
  try {
    await deleteEnquiry(id, { id: user.id, name: user.name, email: user.email });
    revalidatePath("/admin/enquiries");
    revalidatePath("/admin");
    revalidatePath("/admin/reports");
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete enquiry";
    return { ok: false, message };
  }
}
