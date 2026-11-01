"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import {
  IMPORT_FIELDS,
  IMPORT_TOO_LARGE,
  ImportError,
  MAX_IMPORT_BYTES,
  createImportBatch,
  executeImport,
  getImportBatch,
  parseImportFile,
  parseSkippedRowNumbers,
  saveImportMapping,
  correctImportRow,
} from "@/lib/imports";
import type { ImportBatch, ImportKind, User } from "@/lib/types";

function failImports(message: string): never {
  redirect(`/admin/imports?error=${encodeURIComponent(message)}`);
}

function failBatch(batchId: string, message: string): never {
  redirect(`/admin/imports/${batchId}?error=${encodeURIComponent(message)}`);
}

function revalidateImports(batchId?: string) {
  revalidatePath("/admin/imports");
  revalidatePath("/admin");
  if (batchId) revalidatePath(`/admin/imports/${batchId}`);
}

async function accessibleBatch(batchId: string, user: User): Promise<ImportBatch> {
  const batch = await getImportBatch(batchId);
  if (!batch) failImports("That import batch could not be found.");
  if (batch.kind === "ORDERS" && !hasPermission(user, "orders.manage")) {
    redirect("/admin?denied=orders.manage");
  }
  return batch;
}

export async function uploadImportAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("customers.manage");
  const kindValue = String(formData.get("kind") ?? "");
  if (kindValue !== "CUSTOMERS" && kindValue !== "ORDERS") {
    failImports("Choose whether you are importing customers or historical orders.");
  }
  const kind = kindValue as ImportKind;
  if (kind === "ORDERS" && !hasPermission(user, "orders.manage")) {
    redirect("/admin?denied=orders.manage");
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    failImports("Choose a CSV or Excel file to upload.");
  }
  if (file.size > MAX_IMPORT_BYTES) {
    failImports(IMPORT_TOO_LARGE);
  }

  let batchId = "";
  let existingId = "";
  let message = "";
  try {
    const parsed = await parseImportFile(file.name, new Uint8Array(await file.arrayBuffer()));
    const batch = await createImportBatch(
      { ...parsed, kind, filename: file.name },
      { id: user.id, name: user.name, email: user.email },
    );
    batchId = batch.id;
  } catch (error) {
    if (error instanceof ImportError) {
      if (error.existingBatchId) existingId = error.existingBatchId;
      else message = error.message;
    } else {
      console.error("Import upload failed", error);
      message = "The file could not be uploaded. Try again.";
    }
  }

  if (existingId) redirect(`/admin/imports/${existingId}?notice=duplicate`);
  if (message) failImports(message);
  revalidateImports(batchId);
  redirect(`/admin/imports/${batchId}?notice=uploaded`);
}

export async function saveImportMappingAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("customers.manage");
  const batchId = String(formData.get("batchId") ?? "");
  if (!batchId) failImports("That import batch could not be found.");
  const batch = await accessibleBatch(batchId, user);
  const mapping: Record<string, string> = {};
  for (const field of IMPORT_FIELDS[batch.kind]) {
    const value = formData.get(`field:${field.key}`);
    if (typeof value === "string" && value !== "") mapping[field.key] = value;
  }

  let message = "";
  try {
    await saveImportMapping(batchId, mapping, {
      id: user.id,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    if (error instanceof ImportError) message = error.message;
    else {
      console.error("Import mapping failed", error);
      message = "The column mapping could not be saved.";
    }
  }
  if (message) failBatch(batchId, message);
  revalidateImports(batchId);
  redirect(`/admin/imports/${batchId}?notice=mapped`);
}

export async function correctImportRowAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("customers.manage");
  const batchId = String(formData.get("batchId") ?? "");
  const rowIndex = Number(formData.get("rowIndex") ?? -1);
  if (!batchId) failImports("That import batch could not be found.");
  const batch = await accessibleBatch(batchId, user);
  if (!Number.isInteger(rowIndex) || rowIndex < 0 || rowIndex >= batch.rows.length) {
    failBatch(batchId, "That row could not be found.");
  }
  const values: Record<string, string> = {};
  for (const field of IMPORT_FIELDS[batch.kind]) {
    const value = formData.get(`field:${field.key}`);
    if (typeof value === "string") values[field.key] = value;
  }

  let message = "";
  try {
    await correctImportRow(batchId, rowIndex, values, {
      id: user.id,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    if (error instanceof ImportError) message = error.message;
    else {
      console.error("Import row correction failed", error);
      message = "The row could not be saved.";
    }
  }
  if (message) failBatch(batchId, message);
  revalidateImports(batchId);
  redirect(`/admin/imports/${batchId}?notice=corrected`);
}

export async function confirmImportAction(formData: FormData): Promise<void> {
  const { user } = await requirePermission("customers.manage");
  const batchId = String(formData.get("batchId") ?? "");
  if (!batchId) failImports("That import batch could not be found.");
  const batch = await accessibleBatch(batchId, user);
  if (formData.get("confirmed") !== "on") {
    failBatch(batchId, "Confirm that you have reviewed the rows before importing.");
  }

  let message = "";
  try {
    const skipped = parseSkippedRowNumbers(
      String(formData.get("skipRows") ?? ""),
      batch.rows.length,
    );
    await executeImport(
      batchId,
      { id: user.id, name: user.name, email: user.email },
      skipped,
    );
  } catch (error) {
    if (error instanceof ImportError) message = error.message;
    else {
      console.error("Import failed", error);
      message = "The import could not be completed. No further rows were processed.";
    }
  }
  if (message) failBatch(batchId, message);
  revalidateImports(batchId);
  revalidatePath("/admin/customers");
  revalidatePath("/admin/orders");
  redirect(`/admin/imports/${batchId}?notice=imported`);
}
