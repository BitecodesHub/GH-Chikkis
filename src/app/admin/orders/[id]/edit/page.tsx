import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { OrderForm, type OrderProductOption } from "@/components/admin/order-form";
import { requirePermission } from "@/lib/auth/session";
import { businessToday } from "@/lib/dates";
import { getCustomer } from "@/lib/customers";
import { getOrder } from "@/lib/orders";
import { listProducts } from "@/lib/products";

export const metadata: Metadata = { title: "Edit order" };

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("orders.manage");
  const { id } = await params;
  const [order, products] = await Promise.all([getOrder(id), listProducts()]);
  if (!order) notFound();
  if (order.historical) {
    redirect(
      `/admin/orders/${order.id}?error=${encodeURIComponent(
        "Imported historical orders cannot be edited. Their original details are kept as imported.",
      )}`,
    );
  }
  const customer = order.customerId ? await getCustomer(order.customerId) : null;

  const options: OrderProductOption[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    active: product.active,
    packaging: product.packaging.map((option) => ({
      id: option.id,
      label: option.label,
      grams: option.grams,
      standardPricePaise: option.standardPricePaise,
    })),
  }));

  return (
    <div className="space-y-7">
      <AdminPageHeader
        eyebrow={`Order ${order.ref}`}
        title="Edit order"
        description="Saving changes to a sales order issues a new invoice version. Older versions stay available."
        actions={
          <Link href={`/admin/orders/${order.id}`} className="btn btn-quiet btn-sm">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to order
          </Link>
        }
      />
      {order.status === "CANCELLED" ? (
        <div className="border border-terracotta bg-paper-raised px-4 py-3 text-[0.875rem]">
          Cancelled orders cannot be edited. Their invoice and status history stay as issued.
          <Link href={`/admin/orders/${order.id}`} className="link-underline ml-1">
            Return to the order
          </Link>
          .
        </div>
      ) : !customer || !order.customerId ? (
        <div className="border border-terracotta bg-paper-raised px-4 py-3 text-[0.875rem]">
          The customer profile for this order is unavailable, so it cannot be edited.
        </div>
      ) : (
        <OrderForm
          mode="edit"
          order={order}
          customer={{
            id: customer.id,
            name: customer.name,
            phone: customer.phoneOriginal,
            email: customer.email,
          }}
          products={options}
          today={businessToday()}
        />
      )}
    </div>
  );
}
