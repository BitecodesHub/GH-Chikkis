"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { recordAudit, diffFields } from "@/lib/audit";
import { getMediaAssets } from "@/lib/media";
import { parseRupeesToPaise } from "@/lib/money";
import {
  createProduct,
  getProductById,
  updateProduct,
  type ProductWriteInput,
} from "@/lib/products";
import { cleanSingleLine, cleanText, slugify } from "@/lib/text";
import type { PackagingOption } from "@/lib/types";

export interface ProductFormState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function parseJsonArray(value: FormDataEntryValue | null): unknown[] | null {
  if (typeof value !== "string" || value.length > 30_000) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function buildPackaging(
  rows: unknown[],
  errors: Record<string, string>,
): PackagingOption[] {
  if (rows.length === 0) {
    errors.packaging = "Add at least one packaging option.";
    return [];
  }
  if (rows.length > 8) {
    errors.packaging = "Keep packaging options to eight or fewer.";
    return [];
  }
  const seenLabels = new Set<string>();
  const seenIds = new Set<string>();
  const options: PackagingOption[] = [];
  for (const [index, raw] of rows.entries()) {
    const row =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const label = cleanSingleLine(row.label, 40);
    const grams = Number(row.grams);
    const priceRaw = typeof row.price === "number" ? String(row.price) : String(row.price ?? "");
    const pricePaise = priceRaw.trim() === "" ? null : parseRupeesToPaise(priceRaw);

    if (!label) {
      errors.packaging = `Packaging ${index + 1}: enter a label.`;
      break;
    }
    if (seenLabels.has(label.toLowerCase())) {
      errors.packaging = `Packaging ${index + 1}: labels must be unique.`;
      break;
    }
    if (!Number.isInteger(grams) || grams <= 0 || grams > 100_000) {
      errors.packaging = `Packaging ${index + 1}: enter the weight in whole grams.`;
      break;
    }
    if (priceRaw.trim() !== "" && (pricePaise === null || pricePaise < 0)) {
      errors.packaging = `Packaging ${index + 1}: enter a valid standard price, or leave it blank.`;
      break;
    }
    let id =
      typeof row.id === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(row.id)
        ? row.id
        : randomUUID();
    if (seenIds.has(id)) id = randomUUID();
    seenLabels.add(label.toLowerCase());
    seenIds.add(id);
    options.push({
      id,
      label,
      grams,
      standardPricePaise: pricePaise,
    });
  }
  return options;
}

export async function saveProductAction(
  _previous: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const { user } = await requirePermission("catalogue.manage");

  const intent = formData.get("intent") === "create" ? "create" : "update";
  const productId = String(formData.get("productId") ?? "");
  const errors: Record<string, string> = {};

  const name = cleanSingleLine(formData.get("name"), 120);
  if (name.length < 2) errors.name = "Enter the variety name.";

  const rawSlug = cleanSingleLine(formData.get("slug"), 80);
  const slug = slugify(rawSlug || name);
  if (!slug || !SLUG_PATTERN.test(slug)) {
    errors.slug = "Use lowercase letters, numbers and hyphens for the website address.";
  }

  const description = cleanText(formData.get("description"), 4000);
  if (description.length < 10) {
    errors.description = "Write a short description of the variety.";
  }

  const tastingNote = cleanSingleLine(formData.get("tastingNote"), 300);
  const ingredients = cleanText(formData.get("ingredients"), 2000);
  const allergens = cleanText(formData.get("allergens"), 500);

  const displayOrder = Number(formData.get("displayOrder") ?? 0);
  if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 999) {
    errors.displayOrder = "Use a whole number between 0 and 999.";
  }

  const packagingRows = parseJsonArray(formData.get("packaging"));
  if (!packagingRows) {
    errors.packaging = "Packaging could not be read. Reload the page and try again.";
  }
  const packaging = packagingRows ? buildPackaging(packagingRows, errors) : [];

  const mediaIdsRaw = parseJsonArray(formData.get("mediaIds"));
  if (!mediaIdsRaw) {
    errors.media = "The selected photographs could not be read.";
  }
  const mediaIds = (mediaIdsRaw ?? [])
    .filter((id): id is string => typeof id === "string")
    .slice(0, 6);
  const media = await getMediaAssets(mediaIds);
  if ((mediaIdsRaw?.length ?? 0) !== media.length) {
    errors.media = "One or more selected photographs are no longer available.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, message: "Check the highlighted fields.", errors };
  }

  const input: ProductWriteInput = {
    name,
    slug,
    description,
    tastingNote: tastingNote || undefined,
    ingredients: ingredients || undefined,
    allergens: allergens || undefined,
    ingredientsVerified: formData.get("ingredientsVerified") === "on",
    active: formData.get("active") === "on",
    displayOrder,
    packaging,
    media,
  };

  try {
    if (intent === "create") {
      const created = await createProduct(input);
      await recordAudit({
        actor: { id: user.id, email: user.email },
        action: "product.create",
        entityType: "product",
        entityId: created.id,
        summary: `Created variety ${created.name} (${created.slug})`,
      });
      revalidatePath("/admin/products");
      revalidatePath("/collection");
      redirect(`/admin/products/${created.id}?created=1`);
    }

    if (!productId) {
      return { ok: false, message: "The variety could not be identified. Reload and try again." };
    }
    const before = await getProductById(productId);
    const updated = await updateProduct(productId, input);
    if (before) {
      await recordAudit({
        actor: { id: user.id, email: user.email },
        action: "product.update",
        entityType: "product",
        entityId: updated.id,
        summary: `Updated variety ${updated.name} (${updated.slug})`,
        diff: diffFields(
          before as unknown as Record<string, unknown>,
          updated as unknown as Record<string, unknown>,
          ["name", "slug", "active", "displayOrder", "ingredientsVerified", "packaging"],
        ),
      });
    }
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${updated.id}`);
    revalidatePath("/collection");
    revalidatePath(`/collection/${updated.slug}`);
    return { ok: true, message: `Saved ${updated.name}.` };
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    const message =
      error instanceof Error ? error.message : "The variety could not be saved.";
    return { ok: false, message };
  }
}
