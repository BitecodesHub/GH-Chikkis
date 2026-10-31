import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Archive,
  Building2,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  ShoppingBag,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/lib/auth/session";
import { formatAddress, getCustomer } from "@/lib/customers";
import { formatDateDDMMYYYY, formatDateTime } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { customerOrderStats, listCustomerOrders } from "@/lib/orders";
import { getWhatsAppConsent } from "@/lib/messaging";
import { hasPermission } from "@/lib/permissions";
import { ORDER_STATUS_LABELS } from "@/lib/types";
import { setConsentAction, setCustomerArchivedAction } from "../actions";

export const metadata: Metadata = { title: "Customer" };

function Notice({ params }: { params: Record<string, string | string[] | undefined> }) {
  const error = typeof params.error === "string" ? params.error : "";
  if (error) {
    return (
      <p role="alert" className="border border-terracotta bg-paper-raised px-4 py-3 text-[0.875rem] text-terracotta">
        {error}
      </p>
    );
  }
  let message = "";
  if (params.created === "1") message = "Customer profile created.";
  if (params.saved === "1") message = "Customer details saved.";
  if (params.archived === "1") message = "Customer archived. Their orders are unchanged.";
  if (params.restored === "1") message = "Customer restored.";
  if (params.consent === "granted") message = "WhatsApp consent recorded.";
  if (params.consent === "withdrawn")
    message = "WhatsApp consent withdrawn. Unsent messages were discarded.";
  if (!message) return null;
  return (
    <p role="status" className="border border-olive bg-paper-raised px-4 py-3 text-[0.875rem]">
      {message}
    </p>
  );
}

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requirePermission("customers.view");
  const { id } = await params;
  const notices = await searchParams;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  const [orders, statsMap] = await Promise.all([
    listCustomerOrders(customer.id),
    customerOrderStats([customer.id]),
  ]);
  const stats = statsMap.get(customer.id);
  const address = customer.addresses[0];
  const canManage = hasPermission(user, "customers.manage");
  const canOrder = hasPermission(user, "orders.manage");
  const canMessage = hasPermission(user, "messaging.manage");
  const consent = canMessage ? await getWhatsAppConsent(customer.phone) : null;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Customer"
        title={customer.name}
        description={[
          customer.company,
          customer.phoneOriginal,
          customer.archived ? "Archived profile" : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            <Link href="/admin/customers" className="btn btn-quiet btn-sm">
              <ArrowLeft aria-hidden="true" className="size-4" />
              Customers
            </Link>
            {canManage ? (
              <Link href={`/admin/customers/${customer.id}/edit`} className="btn btn-outline btn-sm">
                <Pencil aria-hidden="true" className="size-4" />
                Edit
              </Link>
            ) : null}
            {canOrder && !customer.archived ? (
              <Link
                href={`/admin/orders/new?customerId=${customer.id}`}
                className="btn btn-solid btn-sm"
              >
                <Plus aria-hidden="true" className="size-4" />
                New order
              </Link>
            ) : null}
          </>
        }
      />

      <Notice params={notices} />

      {customer.archived ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-line border-l-4 border-l-brass bg-paper-raised px-4 py-3">
          <p className="text-[0.875rem] text-ink-soft">
            This profile is archived and hidden from customer pickers. Orders and history are
            intact.
          </p>
          {canManage ? (
            <form action={setCustomerArchivedAction}>
              <input type="hidden" name="customerId" value={customer.id} />
              <input type="hidden" name="archived" value="0" />
              <button type="submit" className="btn btn-outline btn-sm">
                <RotateCcw aria-hidden="true" className="size-4" />
                Restore
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Orders", value: String(stats?.count ?? 0) },
          { label: "Sales to date", value: formatINR(stats?.totalPaise ?? 0) },
          { label: "Outstanding", value: formatINR(stats?.outstandingPaise ?? 0) },
          {
            label: "Last order",
            value: stats?.lastOrderDate ? formatDateDDMMYYYY(stats.lastOrderDate) : "—",
          },
        ].map((item) => (
          <div key={item.label} className="surface px-5 py-4">
            <dt className="meta">{item.label}</dt>
            <dd className="mt-1 font-[family-name:var(--font-display)] text-2xl">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="surface" aria-labelledby="order-history">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-4">
            <h2 id="order-history" className="font-[family-name:var(--font-display)] text-xl">
              Order history
            </h2>
            <span className="meta">
              {orders.length} {orders.length === 1 ? "order" : "orders"}
            </span>
          </div>
          {orders.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <ShoppingBag aria-hidden="true" className="mx-auto size-7 text-brass" />
              <p className="display-s mt-4">No orders yet.</p>
              {canOrder && !customer.archived ? (
                <Link
                  href={`/admin/orders/new?customerId=${customer.id}`}
                  className="btn btn-solid mt-5"
                >
                  Create the first order
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-[0.9375rem]">
                <thead>
                  <tr className="border-b border-line text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Order
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Date
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Status
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-paper-raised/60">
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="font-medium hover:underline"
                        >
                          {order.ref}
                        </Link>
                        {order.type === "GIFT" ? (
                          <span className="pill ml-2 border-brass text-brass">Gifting</span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {formatDateDDMMYYYY(order.orderDate)}
                      </td>
                      <td className="px-5 py-3">{ORDER_STATUS_LABELS[order.status]}</td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        {order.type === "GIFT" ? "No charge" : formatINR(order.totalPaise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="surface p-5" aria-labelledby="customer-contact">
            <h2 id="customer-contact" className="font-[family-name:var(--font-display)] text-xl">
              Contact
            </h2>
            <ul className="mt-4 space-y-3 text-[0.9375rem]">
              <li className="flex items-start gap-3">
                <Phone aria-hidden="true" className="mt-1 size-4 shrink-0 text-brass" />
                <a href={`tel:${customer.phone}`} className="hover:underline">
                  {customer.phoneOriginal}
                </a>
              </li>
              {customer.email ? (
                <li className="flex items-start gap-3">
                  <Mail aria-hidden="true" className="mt-1 size-4 shrink-0 text-brass" />
                  <a href={`mailto:${customer.email}`} className="break-all hover:underline">
                    {customer.email}
                  </a>
                </li>
              ) : null}
              {customer.company ? (
                <li className="flex items-start gap-3">
                  <Building2 aria-hidden="true" className="mt-1 size-4 shrink-0 text-brass" />
                  <span>{customer.company}</span>
                </li>
              ) : null}
              {address ? (
                <li className="flex items-start gap-3">
                  <MapPin aria-hidden="true" className="mt-1 size-4 shrink-0 text-brass" />
                  <span>{formatAddress(address)}</span>
                </li>
              ) : null}
            </ul>

            <dl className="mt-5 space-y-2 border-t border-line pt-4 text-[0.875rem]">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">GSTIN</dt>
                <dd>{customer.gstin ?? "Not provided"}</dd>
              </div>
              {!canMessage ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">WhatsApp consent</dt>
                  <dd>
                    {customer.whatsappConsent === "GRANTED"
                      ? "Granted"
                      : customer.whatsappConsent === "WITHDRAWN"
                        ? "Withdrawn"
                        : "Not recorded"}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Profile updated</dt>
                <dd>{formatDateTime(customer.updatedAt)}</dd>
              </div>
            </dl>
          </section>

          {canMessage ? (
            <section className="surface p-5" aria-labelledby="customer-consent">
              <h2
                id="customer-consent"
                className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl"
              >
                <MessageCircle aria-hidden="true" className="size-4 text-brass" />
                WhatsApp consent
              </h2>
              <div className="mt-3 border border-line px-3 py-2 text-[0.8125rem]">
                <p className="font-medium">
                  {consent?.granted
                    ? "Consent recorded"
                    : consent
                      ? "Consent withdrawn"
                      : "No consent recorded"}
                </p>
                {consent ? (
                  <p className="mt-1 text-ink-soft">
                    {consent.source} · {formatDateTime(consent.at)}
                    {consent.note ? ` · ${consent.note}` : ""}
                  </p>
                ) : (
                  <p className="mt-1 text-ink-muted">
                    Record where and when the customer agreed to order messages.
                  </p>
                )}
              </div>
              <form action={setConsentAction} className="mt-4 space-y-3">
                <input type="hidden" name="customerId" value={customer.id} />
                <div>
                  <label htmlFor="consent-state" className="label">
                    Decision
                  </label>
                  <select
                    id="consent-state"
                    name="state"
                    defaultValue={consent && !consent.granted ? "WITHDRAWN" : "GRANTED"}
                    className="field"
                  >
                    <option value="GRANTED">Granted</option>
                    <option value="WITHDRAWN">Withdrawn</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="consent-source" className="label">
                    Source
                  </label>
                  <input
                    id="consent-source"
                    name="source"
                    required
                    minLength={3}
                    maxLength={200}
                    defaultValue={consent?.source ?? ""}
                    placeholder="Customer confirmed on WhatsApp"
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor="consent-note" className="label">
                    Note (optional)
                  </label>
                  <textarea
                    id="consent-note"
                    name="note"
                    rows={2}
                    maxLength={500}
                    defaultValue={consent?.note ?? ""}
                    className="field"
                  />
                </div>
                <p className="text-[0.75rem] leading-relaxed text-ink-muted">
                  Withdrawing consent discards messages that have not sent. Existing sent history
                  stays.
                </p>
                <button type="submit" className="btn btn-outline btn-sm">
                  Save consent
                </button>
              </form>
            </section>
          ) : null}

          <section className="surface p-5" aria-labelledby="customer-notes-view">
            <h2 id="customer-notes-view" className="font-[family-name:var(--font-display)] text-xl">
              Internal notes
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-[0.9375rem] text-ink-soft">
              {customer.notes || "No notes yet."}
            </p>
          </section>

          {canManage && !customer.archived ? (
            <section className="surface p-5" aria-labelledby="customer-archive">
              <h2 id="customer-archive" className="font-[family-name:var(--font-display)] text-xl">
                Archive profile
              </h2>
              <p className="mt-2 text-[0.875rem] text-ink-soft">
                Hides the customer from pickers. Orders, invoices and totals stay in place.
              </p>
              <form action={setCustomerArchivedAction} className="mt-4">
                <input type="hidden" name="customerId" value={customer.id} />
                <input type="hidden" name="archived" value="1" />
                <button type="submit" className="btn btn-outline btn-sm">
                  <Archive aria-hidden="true" className="size-4" />
                  Archive customer
                </button>
              </form>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
