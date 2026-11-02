import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Mail,
  MessageCircle,
  Phone,
  Save,
  ShoppingBag,
  UserPlus,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/lib/auth/session";
import { formatDateDDMMYYYY, formatDateTime } from "@/lib/dates";
import { findCustomerByPhone } from "@/lib/customers";
import { getEnquiry } from "@/lib/enquiries";
import { getOrder } from "@/lib/orders";
import { hasPermission } from "@/lib/permissions";
import { ORDER_STATUS_LABELS } from "@/lib/types";
import { updateEnquiryNotesAction } from "../actions";

export const metadata: Metadata = { title: "Enquiry" };

export default async function EnquiryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requirePermission("enquiries.manage");
  const { id } = await params;
  const notices = await searchParams;
  const enquiry = await getEnquiry(id);
  if (!enquiry) notFound();

  const [linkedOrder, customer] = await Promise.all([
    enquiry.linkedOrderId ? getOrder(enquiry.linkedOrderId) : Promise.resolve(null),
    enquiry.phone ? findCustomerByPhone(enquiry.phone) : Promise.resolve(null),
  ]);
  const canOrder = hasPermission(user, "orders.manage");
  const canCreateCustomer = hasPermission(user, "customers.manage");

  const contact = [enquiry.phoneOriginal || enquiry.phone, enquiry.email].filter(Boolean);
  const hasContact = contact.length > 0;

  const customerHref = customer ? `/admin/customers/${customer.id}` : "";
  const startOrderHref =
    customer && !customer.archived
      ? `/admin/orders/new?customerId=${customer.id}&enquiryId=${enquiry.id}`
      : "";
  const createSearch = new URLSearchParams({ name: enquiry.name });
  const enquiryPhone = enquiry.phoneOriginal || enquiry.phone;
  if (enquiryPhone) createSearch.set("phone", enquiryPhone);
  if (enquiry.email) createSearch.set("email", enquiry.email);
  createSearch.set("enquiryId", enquiry.id);
  const createCustomerHref = `/admin/customers/new?${createSearch.toString()}`;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Enquiry"
        title={enquiry.name}
        description={`Received ${formatDateTime(enquiry.submittedAt)}${
          hasContact ? ` · ${contact.join(" · ")}` : ""
        }`}
        actions={
          <>
            <Link href="/admin/enquiries" className="btn btn-quiet btn-sm">
              <ArrowLeft aria-hidden="true" className="size-4" />
              Enquiries
            </Link>
            {linkedOrder ? (
              <Link href={`/admin/orders/${linkedOrder.id}`} className="btn btn-outline btn-sm">
                <ShoppingBag aria-hidden="true" className="size-4" />
                {linkedOrder.ref}
              </Link>
            ) : startOrderHref && canOrder ? (
              <Link href={startOrderHref} className="btn btn-solid btn-sm">
                <ShoppingBag aria-hidden="true" className="size-4" />
                Start order
              </Link>
            ) : null}
          </>
        }
      />

      {notices.notes === "1" ? (
        <p role="status" className="border border-olive bg-paper-raised px-4 py-3 text-[0.875rem]">
          Internal notes saved.
        </p>
      ) : null}
      {notices.error === "1" ? (
        <p role="alert" className="border border-terracotta bg-paper-raised px-4 py-3 text-[0.875rem]">
          The notes could not be saved. Reload and try again.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <section className="surface" aria-labelledby="enquiry-details">
            <div className="border-b border-line px-5 py-4">
              <h2
                id="enquiry-details"
                className="font-[family-name:var(--font-display)] text-xl"
              >
                What they asked for
              </h2>
            </div>
            <dl className="grid gap-x-6 gap-y-5 px-5 py-5 sm:grid-cols-2">
              <div>
                <dt className="meta">Quantity</dt>
                <dd className="mt-1 text-[1.0625rem]">{enquiry.quantityKg} kg</dd>
              </div>
              {enquiry.notSure || enquiry.expectedDate ? (
                <div>
                  <dt className="meta">Expected date</dt>
                  <dd className="mt-1 flex items-center gap-2 text-[1.0625rem]">
                    <CalendarDays aria-hidden="true" className="size-4 text-brass" />
                    {enquiry.notSure ? "Not sure yet" : formatDateDDMMYYYY(enquiry.expectedDate)}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="meta">How to reply</dt>
                <dd className="mt-1 space-y-1 text-[0.9375rem]">
                  {enquiryPhone ? (
                    <a href={`tel:${enquiry.phone}`} className="block hover:underline">
                      {enquiryPhone}
                    </a>
                  ) : null}
                  {enquiry.email ? (
                    <a
                      href={`mailto:${enquiry.email}`}
                      className="block break-all hover:underline"
                    >
                      {enquiry.email}
                    </a>
                  ) : null}
                  {!hasContact ? (
                    <span className="text-ink-muted">
                      They sent no phone or email. Ask them to continue on WhatsApp, or use
                      the number they wrote in their message.
                    </span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="meta">WhatsApp consent</dt>
                <dd className="mt-1">
                  {enquiry.whatsappConsent
                    ? "Given on the website form"
                    : "Not given — automatic messages stay off"}
                </dd>
              </div>
              <div>
                <dt className="meta">Source</dt>
                <dd className="mt-1">Website enquiry form</dd>
              </div>
            </dl>
            <div className="border-t border-line px-5 py-5">
              <h3 className="meta">Message from the customer</h3>
              <p className="mt-2 whitespace-pre-wrap text-[0.9375rem] text-ink-soft">
                {enquiry.notes || "No message included."}
              </p>
            </div>
          </section>

          <section className="surface p-5 sm:p-6" aria-labelledby="enquiry-notes">
            <h2 id="enquiry-notes" className="font-[family-name:var(--font-display)] text-xl">
              Internal notes
            </h2>
            <p className="mt-1 text-[0.875rem] text-ink-soft">
              Private to the team. Keep call outcomes, preferences and follow-up dates here.
            </p>
            <form action={updateEnquiryNotesAction} className="mt-5">
              <input type="hidden" name="enquiryId" value={enquiry.id} />
              <label htmlFor="internalNotes" className="label">
                Notes
              </label>
              <textarea
                id="internalNotes"
                name="internalNotes"
                rows={5}
                maxLength={4000}
                defaultValue={enquiry.internalNotes ?? ""}
                placeholder="Called on 30 October · asked for a Diwali delivery · prefers jaggery chikkis"
                className="field"
              />
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="meta">
                  {enquiry.updatedByName
                    ? `Last updated by ${enquiry.updatedByName}`
                    : "Not updated yet"}
                </p>
                <button type="submit" className="btn btn-outline btn-sm">
                  <Save aria-hidden="true" className="size-4" />
                  Save notes
                </button>
              </div>
            </form>
          </section>
        </div>

        <div className="space-y-6">
          <section className="surface p-5" aria-labelledby="enquiry-next">
            <h2 id="enquiry-next" className="font-[family-name:var(--font-display)] text-xl">
              Next step
            </h2>
            {linkedOrder ? (
              <div className="mt-4">
                <p className="flex items-center gap-2 text-[0.9375rem]">
                  <Check aria-hidden="true" className="size-4 text-olive" />
                  Order created
                </p>
                <Link
                  href={`/admin/orders/${linkedOrder.id}`}
                  className="mt-3 block border border-line bg-paper-raised px-4 py-3 hover:border-brass"
                >
                  <span className="font-medium">{linkedOrder.ref}</span>
                  <span className="mt-1 block text-[0.875rem] text-ink-muted">
                    {ORDER_STATUS_LABELS[linkedOrder.status]} ·{" "}
                    {formatDateDDMMYYYY(linkedOrder.orderDate)}
                  </span>
                </Link>
              </div>
            ) : customer ? (
              <div className="mt-4 space-y-3">
                <p className="text-[0.9375rem] text-ink-soft">
                  A customer profile already uses this phone number.
                </p>
                <Link
                  href={customerHref}
                  className="block border border-line bg-paper-raised px-4 py-3 hover:border-brass"
                >
                  <span className="font-medium">{customer.name}</span>
                  <span className="mt-1 block text-[0.875rem] text-ink-muted">
                    {customer.phoneOriginal}
                    {customer.archived ? " · Archived" : ""}
                  </span>
                </Link>
                {customer.archived ? (
                  <p className="text-[0.875rem] text-terracotta">
                    Restore the profile before starting an order.
                  </p>
                ) : startOrderHref && canOrder ? (
                  <Link href={startOrderHref} className="btn btn-solid btn-sm w-full justify-center">
                    <ShoppingBag aria-hidden="true" className="size-4" />
                    Start order for this customer
                  </Link>
                ) : (
                  <p className="text-[0.875rem] text-ink-muted">
                    Someone with order access can start the order from the customer profile.
                  </p>
                )}
              </div>
            ) : canCreateCustomer ? (
              <div className="mt-4 space-y-3">
                <p className="text-[0.9375rem] text-ink-soft">
                  {hasContact
                    ? "This phone number has no customer profile yet. Create one from the enquiry details, then continue to the order."
                    : "No phone or email on this enquiry. Get their number from the conversation, then create the profile and continue to the order."}
                </p>
                <Link
                  href={createCustomerHref}
                  className="btn btn-solid btn-sm w-full justify-center"
                >
                  <UserPlus aria-hidden="true" className="size-4" />
                  Create customer &amp; start order
                </Link>
              </div>
            ) : (
              <p className="mt-4 text-[0.875rem] text-ink-soft">
                A teammate with customer access needs to create the customer profile first.
              </p>
            )}
          </section>

          <section className="surface p-5" aria-labelledby="enquiry-contact">
            <h2 id="enquiry-contact" className="font-[family-name:var(--font-display)] text-xl">
              Contact
            </h2>
            <ul className="mt-4 space-y-3 text-[0.9375rem]">
              {enquiryPhone ? (
                <li>
                  <a
                    href={`tel:${enquiry.phone}`}
                    className="flex items-center gap-3 hover:underline"
                  >
                    <Phone aria-hidden="true" className="size-4 text-brass" />
                    {enquiryPhone}
                  </a>
                </li>
              ) : (
                <li className="flex items-start gap-3 text-ink-muted">
                  <Phone aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brass" />
                  No phone number was given
                </li>
              )}
              {enquiry.email ? (
                <li>
                  <a
                    href={`mailto:${enquiry.email}`}
                    className="flex items-center gap-3 break-all hover:underline"
                  >
                    <Mail aria-hidden="true" className="size-4 shrink-0 text-brass" />
                    {enquiry.email}
                  </a>
                </li>
              ) : null}
            </ul>
            <p className="mt-4 flex items-start gap-2 border-t border-line pt-4 text-[0.8125rem] text-ink-muted">
              <MessageCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brass" />
              Reply using the WhatsApp app on the business phone. Automatic messages arrive in
              a later phase and are never sent without consent.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
