import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Inbox } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CustomerPicker } from "@/components/admin/customer-picker";
import { OrderForm, type OrderProductOption } from "@/components/admin/order-form";
import { requirePermission } from "@/lib/auth/session";
import { businessToday, formatDateDDMMYYYY } from "@/lib/dates";
import { findCustomerByPhone, getCustomer } from "@/lib/customers";
import { getEnquiry } from "@/lib/enquiries";
import { listProducts } from "@/lib/products";

export const metadata: Metadata = { title: "New order" };

function productOptions(products: Awaited<ReturnType<typeof listProducts>>): OrderProductOption[] {
  return products.map((product) => ({
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
}

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("orders.manage");
  const params = await searchParams;
  const customerId = typeof params.customerId === "string" ? params.customerId : "";
  const enquiryId = typeof params.enquiryId === "string" ? params.enquiryId : "";

  const [products, enquiry] = await Promise.all([
    listProducts(),
    enquiryId ? getEnquiry(enquiryId) : Promise.resolve(null),
  ]);
  const options = productOptions(products);

  let customer = customerId ? await getCustomer(customerId) : null;
  if (!customer && enquiry) {
    const match = await findCustomerByPhone(enquiry.phone);
    if (match && !match.archived) {
      const search = new URLSearchParams({ customerId: match.id, enquiryId: enquiry.id });
      redirect(`/admin/orders/new?${search.toString()}`);
    }
    customer = match;
  }

  const createSearch = new URLSearchParams({ next: "/admin/orders/new" });
  if (enquiry) {
    createSearch.set("name", enquiry.name);
    createSearch.set("phone", enquiry.phoneOriginal);
    if (enquiry.email) createSearch.set("email", enquiry.email);
    createSearch.set("enquiryId", enquiry.id);
  }
  const createHref = `/admin/customers/new?${createSearch.toString()}`;
  const pickerQuery = enquiryId ? `enquiryId=${encodeURIComponent(enquiryId)}` : "";

  return (
    <div className="space-y-7">
      <AdminPageHeader
        eyebrow="Orders"
        title="New order"
        description="Record a sales order or a gift. Nothing is sent to the customer automatically."
        actions={
          <Link href="/admin/orders" className="btn btn-quiet btn-sm">
            <ArrowLeft aria-hidden="true" className="size-4" />
            All orders
          </Link>
        }
      />

      {enquiry ? (
        <div className="flex flex-wrap items-center gap-3 border border-brass/40 bg-paper-raised px-4 py-3 text-[0.875rem]">
          <Inbox aria-hidden="true" className="size-4 text-brass" />
          <p className="text-ink-soft">
            From the enquiry by <strong>{enquiry.name}</strong> · {enquiry.quantityKg} kg ·{" "}
            {enquiry.notSure
              ? "date not decided"
              : enquiry.expectedDate
                ? `expected ${formatDateDDMMYYYY(enquiry.expectedDate)}`
                : "no date"}
            .
          </p>
          <Link
            href={`/admin/enquiries/${enquiry.id}`}
            className="ml-auto text-brass-ink hover:underline"
          >
            View enquiry
          </Link>
        </div>
      ) : null}

      {customer && customer.archived ? (
        <div className="border border-terracotta bg-paper-raised px-4 py-3 text-[0.875rem]">
          That customer profile is archived and cannot take a new order. Choose another
          customer or{" "}
          <Link href={`/admin/customers/${customer.id}`} className="link-underline">
            restore the profile
          </Link>
          .
        </div>
      ) : customer ? (
        <OrderForm
          mode="create"
          customer={{
            id: customer.id,
            name: customer.name,
            phone: customer.phoneOriginal,
            email: customer.email,
          }}
          products={options}
          today={businessToday()}
          enquiryId={enquiry?.id}
          enquirySummary={
            enquiry
              ? `Saving this order links it to the ${enquiry.name} enquiry.`
              : undefined
          }
          idempotencyKey={randomUUID()}
        />
      ) : (
        <CustomerPicker createHref={createHref} orderQuery={pickerQuery} />
      )}
    </div>
  );
}
