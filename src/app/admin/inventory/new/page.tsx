import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { InventoryItemForm } from "@/components/admin/inventory-item-form";
import { requirePermission } from "@/lib/auth/session";
import { INVENTORY_UNITS, inventoryCategories } from "@/lib/inventory";
import { createInventoryItemAction } from "../actions";

export const metadata: Metadata = { title: "Add inventory item" };

export default async function NewInventoryItemPage() {
  await requirePermission("inventory.manage");
  const categories = await inventoryCategories();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Inventory"
        title="Add item"
        description="Track anything you count by hand: ingredients, packaging or supplies. Opening stock is recorded as the first movement."
        actions={
          <Link href="/admin/inventory" className="btn btn-outline btn-sm">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to inventory
          </Link>
        }
      />
      <section className="surface p-5 sm:p-6" aria-labelledby="new-item">
        <h2 id="new-item" className="font-[family-name:var(--font-display)] text-xl">
          Item details
        </h2>
        <div className="mt-5">
          <InventoryItemForm
            mode="create"
            categories={categories}
            units={INVENTORY_UNITS}
            action={createInventoryItemAction}
          />
        </div>
      </section>
    </div>
  );
}
