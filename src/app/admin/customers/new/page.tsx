import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CustomerForm } from "@/components/admin/customer-form";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New customer" };

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("customers.manage");
  const params = await searchParams;
  const name = typeof params.name === "string" ? params.name : "";
  const phone = typeof params.phone === "string" ? params.phone : "";
  const email = typeof params.email === "string" ? params.email : "";
  const enquiryId = typeof params.enquiryId === "string" ? params.enquiryId : "";
  const requestedNext = typeof params.next === "string" ? params.next : "";
  const next =
    requestedNext.startsWith("/admin/") && !requestedNext.startsWith("//")
      ? requestedNext
      : enquiryId
        ? `/admin/orders/new?enquiryId=${encodeURIComponent(enquiryId)}`
        : undefined;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Customers"
        title="New customer"
        description="Create a profile once; orders, invoices and enquiries stay linked to it."
        actions={
          <Link href="/admin/customers" className="btn btn-quiet btn-sm">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to customers
          </Link>
        }
      />
      {enquiryId || next ? (
        <p className="border border-brass/40 bg-paper-raised px-4 py-3 text-[0.875rem] text-ink-soft">
          {enquiryId
            ? "This profile continues an enquiry. After saving, the order form opens with the enquiry attached."
            : "After saving, you will return to the order form with this customer selected."}
        </p>
      ) : null}
      <CustomerForm
        mode="create"
        defaults={{ name, phone, email }}
        next={next}
      />
    </div>
  );
}
