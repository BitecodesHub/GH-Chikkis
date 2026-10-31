"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { updateEnquiryNotes } from "@/lib/enquiries";

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
