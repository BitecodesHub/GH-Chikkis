"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { passwordProblem, verifyPassword } from "@/lib/auth/password";
import { recordAudit } from "@/lib/audit";
import { clearReviewsSnapshot } from "@/lib/google-reviews";
import { getSettings, updateSettings } from "@/lib/settings";
import { getUserById, setPasswordForUser } from "@/lib/users";
import { cleanSingleLine, cleanText } from "@/lib/text";
import { normalizePhone } from "@/lib/phone";

function fail(message: string): never {
  redirect(`/admin/settings?error=${encodeURIComponent(message)}`);
}

export async function changeMyPasswordAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("settings.manage");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next !== String(formData.get("confirm") ?? "")) {
    fail("The new passwords do not match.");
  }
  const problem = passwordProblem(next);
  if (problem) fail(problem);

  const target = await getUserById(user.id);
  if (!target) fail("Your account could not be found.");
  if (target.passwordHash && !verifyPassword(current, target.passwordHash)) {
    fail("That is not your current password.");
  }

  await setPasswordForUser(target._id, next);
  await recordAudit({
    actor: { id: user.id, email: user.email },
    action: "user.update",
    entityType: "user",
    entityId: target._id,
    summary: "Changed their own sign-in password",
  });
  revalidatePath("/admin/settings");
  redirect("/admin/settings?password=1");
}

export async function saveSettingsAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("settings.manage");
  const before = await getSettings();

  const business = {
    name: cleanSingleLine(formData.get("businessName"), 120),
    tagline: cleanSingleLine(formData.get("tagline"), 120),
    city: cleanSingleLine(formData.get("city"), 80),
    state: cleanSingleLine(formData.get("state"), 80),
    whatsappNumber: cleanSingleLine(formData.get("whatsappNumber"), 30),
    email: cleanSingleLine(formData.get("email"), 160),
    phoneDisplay: cleanSingleLine(formData.get("phoneDisplay"), 40),
    instagramUrl: cleanSingleLine(formData.get("instagramUrl"), 300),
    addressLine: cleanSingleLine(formData.get("addressLine"), 300),
    gstin: cleanSingleLine(formData.get("gstin"), 20).toUpperCase(),
  };

  if (!business.name) fail("Enter the business name used on invoices.");
  if (business.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(business.email)) {
    fail("Enter a valid business email address, or leave it blank.");
  }
  if (business.whatsappNumber && !normalizePhone(business.whatsappNumber)) {
    fail("Enter a valid WhatsApp number, including the country code.");
  }
  if (business.instagramUrl) {
    try {
      const url = new URL(business.instagramUrl);
      if (url.protocol !== "https:" || !/(^|\.)instagram\.com$/i.test(url.hostname)) {
        fail("Enter a full Instagram URL beginning with https://instagram.com/.");
      }
    } catch {
      fail("Enter a full Instagram URL beginning with https://instagram.com/.");
    }
  }
  if (business.gstin && !/^[0-9A-Z]{15}$/.test(business.gstin)) {
    fail("GSTIN must be 15 letters and digits, or leave it blank.");
  }

  const categories = Array.from(
    new Set(
      String(formData.get("expenseCategories") ?? "")
        .split("\n")
        .map((line) => cleanSingleLine(line, 60))
        .filter(Boolean),
    ),
  );
  if (categories.length === 0) fail("Keep at least one expense category.");
  if (categories.length > 20) fail("Use 20 expense categories or fewer.");

  const retentionDays = Number(formData.get("retentionDays"));
  if (!Number.isInteger(retentionDays) || retentionDays < 7 || retentionDays > 365) {
    fail("Backup retention must be a whole number of days between 7 and 365.");
  }
  const idleMinutes = Number(formData.get("idleMinutes"));
  if (!Number.isInteger(idleMinutes) || idleMinutes < 15 || idleMinutes > 480) {
    fail("Idle sign-out must be a whole number of minutes between 15 and 480.");
  }

  const invoice = {
    thankYou: cleanText(formData.get("thankYou"), 500),
    footerNote: cleanText(formData.get("footerNote"), 500),
  };

  const reviews = {
    enabled: formData.get("showGoogleReviews") === "on",
    googlePlaceId: cleanSingleLine(formData.get("googlePlaceId"), 120),
  };
  if (reviews.googlePlaceId && !/^[A-Za-z0-9_-]{10,120}$/.test(reviews.googlePlaceId)) {
    fail("A Google Place ID is a long string of letters, numbers, hyphens and underscores.");
  }
  if (reviews.enabled && !reviews.googlePlaceId) {
    fail("Add the Google Place ID before turning reviews on.");
  }

  const after = await updateSettings(
    {
      business,
      invoice,
      reviews,
      expenseCategories: categories,
      backup: { retentionDays },
      security: { idleMinutes },
    },
    user.email,
  );

  if (
    before.reviews.googlePlaceId !== after.reviews.googlePlaceId ||
    before.reviews.enabled !== after.reviews.enabled
  ) {
    await clearReviewsSnapshot();
  }

  const changed = [
    before.business.name !== after.business.name ? "business profile" : null,
    before.invoice.thankYou !== after.invoice.thankYou ||
    before.invoice.footerNote !== after.invoice.footerNote
      ? "invoice text"
      : null,
    before.expenseCategories.join("\n") !== after.expenseCategories.join("\n")
      ? "expense categories"
      : null,
    before.reviews.enabled !== after.reviews.enabled ||
    before.reviews.googlePlaceId !== after.reviews.googlePlaceId
      ? "Google reviews"
      : null,
    before.security.idleMinutes !== after.security.idleMinutes ? "idle sign-out" : null,
    before.backup.retentionDays !== after.backup.retentionDays ? "backup retention" : null,
  ].filter(Boolean);

  await recordAudit({
    actor: { id: user.id, email: user.email },
    action: "settings.business",
    entityType: "settings",
    entityId: "business",
    summary:
      changed.length > 0
        ? `Updated ${changed.join(", ")}`
        : "Saved business settings without changes",
  });

  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/contact");
  redirect("/admin/settings?saved=1");
}
