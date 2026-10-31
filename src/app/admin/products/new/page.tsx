import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { requirePermission } from "@/lib/auth/session";
import { listMediaAssets } from "@/lib/media";
import { listProducts, nextDisplayOrder } from "@/lib/products";

export const metadata: Metadata = { title: "New variety" };

export default async function NewProductPage() {
  await requirePermission("catalogue.manage");
  const [products, assets] = await Promise.all([listProducts(), listMediaAssets()]);

  return (
    <div className="space-y-7">
      <AdminPageHeader
        eyebrow="Catalogue / Products"
        title="New variety"
        description="Add a chikki to the collection. You can keep it paused until the details and photographs are ready."
        actions={
          <Link href="/admin/products" className="btn btn-outline btn-sm">
            <ArrowLeft aria-hidden="true" className="size-4" />
            All products
          </Link>
        }
      />
      <ProductForm
        mode="create"
        assets={assets}
        nextDisplayOrder={nextDisplayOrder(products)}
      />
    </div>
  );
}
