import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { requirePermission } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/dates";
import { listMediaAssets } from "@/lib/media";
import { getProductById } from "@/lib/products";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  return { title: product ? product.name : "Variety" };
}

export default async function EditProductPage({ params, searchParams }: PageProps) {
  await requirePermission("catalogue.manage");
  const { id } = await params;
  const query = await searchParams;
  const [product, assets] = await Promise.all([getProductById(id), listMediaAssets()]);
  if (!product) notFound();

  const justCreated = query.created === "1";

  return (
    <div className="space-y-7">
      <AdminPageHeader
        eyebrow="Catalogue / Products"
        title={product.name}
        description={`Last updated ${formatDateTime(product.updatedAt)} · Asia/Kolkata`}
        actions={
          <>
            <Link href="/admin/products" className="btn btn-outline btn-sm">
              <ArrowLeft aria-hidden="true" className="size-4" />
              All products
            </Link>
            {product.active ? (
              <Link
                href={`/collection/${product.slug}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-quiet btn-sm"
              >
                View live
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </Link>
            ) : null}
          </>
        }
      />

      {justCreated ? (
        <p
          role="status"
          className="border border-olive bg-paper-raised px-4 py-3 text-[0.875rem]"
        >
          {product.name} was created. Add packaging prices and photographs, then tick
          “Listed on the website” when it is ready.
        </p>
      ) : null}

      <ProductForm
        mode="edit"
        product={product}
        assets={assets}
        nextDisplayOrder={product.displayOrder}
      />

      <p className="text-[0.75rem] text-ink-muted">
        Varieties are paused by unticking “Listed on the website”; existing orders keep
        their saved product details.
      </p>
    </div>
  );
}
