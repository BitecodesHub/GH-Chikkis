import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CustomerForm } from "@/components/admin/customer-form";
import { requirePermission } from "@/lib/auth/session";
import { getCustomer } from "@/lib/customers";

export const metadata: Metadata = { title: "Edit customer" };

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("customers.manage");
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Customers"
        title={`Edit ${customer.name}`}
        description="Phone numbers must stay unique. Changes are recorded in the audit log."
        actions={
          <Link href={`/admin/customers/${customer.id}`} className="btn btn-quiet btn-sm">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to profile
          </Link>
        }
      />
      <CustomerForm mode="edit" customer={customer} />
    </div>
  );
}
