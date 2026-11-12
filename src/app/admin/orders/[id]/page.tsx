import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Download,
  FileText,
  Gift,
  History,
  Mail,
  MessageCircle,
  Pencil,
  ReceiptText,
  RefreshCw,
  Send,
  Truck,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { OrderDeleteButton } from "@/components/admin/order-delete-button";
import { OrderToggle } from "@/components/admin/order-toggle";
import { requirePermission } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { formatDateDDMMYYYY, formatDateTime, businessToday } from "@/lib/dates";
import { getCustomer } from "@/lib/customers";
import { getEnquiry } from "@/lib/enquiries";
import { formatINR, paiseToInput } from "@/lib/money";
import {
  getOrder,
  listInvoiceVersions,
  listPayments,
  listRefunds,
} from "@/lib/orders";
import {
  NOTIFICATION_STATUS_LABELS,
  NOTIFICATION_TYPE_LABELS,
  getWhatsAppConsent,
  invoiceHandoff,
  listOrderNotifications,
  messagingModeInfo,
} from "@/lib/messaging";
import { buildInvoiceEmailDraft, emailModeInfo, listOrderEmails } from "@/lib/email";
import { expenseCategories } from "@/lib/expenses";
import { hasPermission } from "@/lib/permissions";
import {
  DELIVERY_METHOD_LABELS,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_HISTORY_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type EmailMessage,
  type NotificationStatus,
} from "@/lib/types";
import {
  addOrderExpenseAction,
  addPaymentAction,
  addRefundAction,
  changeOrderStatusAction,
} from "../actions";
import {
  approveOrderMessageAction,
  discardOrderMessageAction,
  rebuildOrderMessageAction,
  retryOrderEmailAction,
  retryOrderMessageAction,
  sendOrderEmailAction,
  sendOrderMessageAction,
} from "../message-actions";

export const metadata: Metadata = { title: "Order" };

const MESSAGE_STATUS_STYLES: Record<NotificationStatus, string> = {
  QUEUED: "border-brass text-brass",
  NEEDS_REVIEW: "border-olive-deep text-olive-deep",
  SENDING: "border-brass text-brass",
  SENT: "border-olive-soft text-olive",
  DELIVERED: "border-olive-deep text-olive-deep",
  READ: "border-olive-deep text-olive-deep",
  FAILED: "border-terracotta text-terracotta",
  SIMULATED: "border-line text-ink-muted",
  DISCARDED: "border-line text-ink-muted",
  BLOCKED: "border-terracotta text-terracotta",
};

const EMAIL_STATUS_STYLES: Record<EmailMessage["status"], string> = {
  SENT: "border-olive-soft text-olive",
  SIMULATED: "border-line text-ink-muted",
  FAILED: "border-terracotta text-terracotta",
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requirePermission("orders.view");
  const { id } = await params;
  const notices = await searchParams;
  const order = await getOrder(id);
  if (!order) notFound();

  const isGift = order.type === "GIFT";
  const isSales = order.type === "SALES";
  // Customers collect from the shop or arrange their own porter, so new orders
  // carry no delivery details. Older and imported ones still can, and their
  // charge is part of the total, so those keep the panel.
  const hasDelivery =
    order.delivery.method !== "HOME_COLLECTION" ||
    order.delivery.chargePaise > 0 ||
    Boolean(order.delivery.notes);
  const canManage = hasPermission(user, "orders.manage");
  const canPayments = hasPermission(user, "payments.manage");
  const canRecordCost = hasPermission(user, "expenses.manage");
  const canMessage = hasPermission(user, "messaging.manage");
  const [customer, enquiry, payments, refunds, versions, notifications, emails, consent, emailDraft, handoff] =
    await Promise.all([
      order.customerId ? getCustomer(order.customerId) : Promise.resolve(null),
      order.enquiryId ? getEnquiry(order.enquiryId) : Promise.resolve(null),
      isSales ? listPayments(order.id) : Promise.resolve([]),
      isSales ? listRefunds(order.id) : Promise.resolve([]),
      isSales ? listInvoiceVersions(order.id) : Promise.resolve([]),
      isSales ? listOrderNotifications(order.id) : Promise.resolve([]),
      isSales ? listOrderEmails(order.id) : Promise.resolve([]),
      isSales ? getWhatsAppConsent(order.customerSnapshot.phone) : Promise.resolve(null),
      isSales && order.invoice
        ? buildInvoiceEmailDraft(order.id).catch(() => null)
        : Promise.resolve(null),
      isSales && canMessage ? invoiceHandoff(order) : Promise.resolve(null),
    ]);

  const costCategories = canRecordCost ? await expenseCategories() : [];
  // A cost against an order is almost always the porter or a courier slip.
  const costDefaultCategory =
    costCategories.find((category) => /transport/i.test(category)) ??
    costCategories.find((category) => /misc/i.test(category)) ??
    "";
  const canReviewMessages = hasPermission(user, "messaging.review");
  const messageMode = messagingModeInfo();
  const mailMode = emailModeInfo();
  const netReceived = order.paidPaise - order.refundedPaise;
  const outstanding = Math.max(order.balancePaise, 0);
  const errorMessage = first(notices.error);

  const notice = (() => {
    if (notices.created === "1")
      return handoff
        ? "Order created. Use “Open in WhatsApp” above to send the invoice."
        : "Order created.";
    if (notices.saved === "1")
      return isSales
        ? "Order saved. A new invoice version was issued only if the content changed."
        : "Gift record saved.";
    if (notices.paid === "1") return "Payment recorded.";
    if (notices.refunded === "1") return "Refund recorded.";
    if (notices.expense === "1") return "Cost recorded and visible in Expenses.";
    if (notices.status === "1") return "Order status updated.";
    if (notices.message === "1") {
      const state = first(notices.state);
      if (state === "simulated")
        return "Test-mode WhatsApp message recorded. Nothing was sent to the customer.";
      if (state === "sent") return "WhatsApp message sent.";
      if (state === "queued") return "WhatsApp message queued.";
      if (state === "needs_review")
        return "WhatsApp message needs review before it can send. See the messages section below.";
      if (state === "failed")
        return "WhatsApp message failed. Check the reason in the messages section below.";
      if (state === "discarded") return "WhatsApp message discarded.";
      return "WhatsApp message prepared.";
    }
    if (notices.message_action === "approved") return "WhatsApp message approved.";
    if (notices.message_action === "rebuilt")
      return "WhatsApp message rebuilt from the current order. Review it before approving.";
    if (notices.message_action === "discarded") return "WhatsApp message discarded.";
    if (notices.message_action === "retried") return "WhatsApp message retried.";
    if (notices.email === "1") {
      const state = first(notices.state);
      if (state === "simulated")
        return "Test-mode email recorded. Nothing was sent — switch GMAIL_MODE to live to send.";
      if (state === "sent") return "Email sent.";
      if (state === "failed")
        return "The email failed. Check the error below, fix the cause, then retry.";
      return "Email processed.";
    }
    return "";
  })();

  const entries = [
    ...payments.map((payment) => ({
      id: `payment-${payment.id}`,
      kind: "Payment" as const,
      date: payment.date,
      createdAt: payment.createdAt,
      method: payment.method,
      detail: [payment.reference, payment.notes].filter(Boolean).join(" · "),
      amountPaise: payment.amountPaise,
      by: payment.createdByName,
    })),
    ...refunds.map((refund) => ({
      id: `refund-${refund.id}`,
      kind: "Refund" as const,
      date: refund.date,
      createdAt: refund.refundedAt,
      method: refund.method,
      detail: refund.reason,
      amountPaise: -refund.amountPaise,
      by: refund.createdByName,
    })),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const versionRows = versions.length
    ? versions
    : order.invoice
      ? [
          {
            id: `embedded-${order.id}`,
            version: order.invoice.version,
            createdAt: order.invoice.issuedAt,
            createdByName: order.createdByName,
            supersededAt: undefined as string | undefined,
            snapshot: order.invoice.snapshot,
          },
        ]
      : [];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow={isGift ? "Gifting record" : "Sales order"}
        title={order.ref}
        description={[
          formatDateDDMMYYYY(order.orderDate),
          order.customerSnapshot.name,
          order.historical
            ? "Imported historical order"
            : isGift
              ? "Gifting · excluded from revenue"
              : "Sales",
          order.expectedDate ? `Expected ${formatDateDDMMYYYY(order.expectedDate)}` : "",
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            <Link href="/admin/orders" className="btn btn-quiet btn-sm">
              <ArrowLeft aria-hidden="true" className="size-4" />
              Orders
            </Link>
            {canManage && order.status !== "CANCELLED" && !order.historical ? (
              <Link href={`/admin/orders/${order.id}/edit`} className="btn btn-outline btn-sm">
                <Pencil aria-hidden="true" className="size-4" />
                Edit
              </Link>
            ) : null}
            {canManage && !order.historical ? (
              <OrderDeleteButton orderId={order.id} orderRef={order.ref} />
            ) : null}
            {isSales && order.invoice ? (
              <a
                href={`/admin/orders/${order.id}/invoice/${order.invoice.version}`}
                className="btn btn-solid btn-sm"
              >
                <Download aria-hidden="true" className="size-4" />
                Invoice PDF
              </a>
            ) : null}
            {handoff ? (
              <a
                href={handoff.href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm"
              >
                <MessageCircle aria-hidden="true" className="size-4" />
                Open in WhatsApp
              </a>
            ) : null}
          </>
        }
      />

      {notice ? (
        <p role="status" className="border border-olive bg-paper-raised px-4 py-3 text-[0.875rem]">
          {notice}
        </p>
      ) : null}
      {errorMessage ? (
        <p role="alert" className="border border-terracotta bg-paper-raised px-4 py-3 text-[0.875rem]">
          {errorMessage}
        </p>
      ) : null}

      {order.status === "CANCELLED" ? (
        <div className="border border-terracotta border-l-4 bg-paper-raised px-4 py-3">
          <p className="font-medium text-terracotta">This order is cancelled.</p>
          <p className="mt-1 text-[0.875rem] text-ink-soft">
            {isSales && netReceived > 0
              ? "Payments are still on record. Record a refund if money is being returned. The invoice number stays issued."
              : "The record and its history stay available. Cancelled orders cannot be edited or take payments."}
          </p>
        </div>
      ) : null}

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isSales ? (
          <>
            <div className="surface px-5 py-4">
              <dt className="meta">Order total</dt>
              <dd className="mt-1 font-[family-name:var(--font-display)] text-2xl">
                {formatINR(order.totalPaise)}
              </dd>
            </div>
            <div className="surface px-5 py-4">
              <dt className="meta">Net received</dt>
              <dd className="mt-1 font-[family-name:var(--font-display)] text-2xl">
                {formatINR(netReceived)}
              </dd>
              <p className="mt-1 text-[0.75rem] text-ink-muted">
                {formatINR(order.refundedPaise)} refunded
              </p>
            </div>
            <div className="surface px-5 py-4">
              <dt className="meta">Balance</dt>
              <dd
                className={cn(
                  "mt-1 font-[family-name:var(--font-display)] text-2xl",
                  outstanding > 0 && order.status !== "CANCELLED" && "text-terracotta",
                )}
              >
                {formatINR(outstanding)}
              </dd>
              <div className="mt-2">
                <OrderToggle
                  kind="payment"
                  orderId={order.id}
                  type={order.type}
                  status={order.status}
                  paymentStatus={order.paymentStatus}
                  canManage={canManage}
                  canPay={canPayments}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="surface px-5 py-4">
              <dt className="meta">Gift value (internal)</dt>
              <dd className="mt-1 font-[family-name:var(--font-display)] text-2xl">
                {formatINR(order.totalPaise)}
              </dd>
              <p className="mt-1 text-[0.75rem] text-ink-muted">Never counted as revenue</p>
            </div>
            <div className="surface px-5 py-4">
              <dt className="meta">Gifting cost</dt>
              <dd className="mt-1 font-[family-name:var(--font-display)] text-2xl">
                {formatINR(order.gift?.costPaise ?? 0)}
              </dd>
              <p className="mt-1 text-[0.75rem] text-ink-muted">
                {order.gift?.treatment === "ALREADY_RECORDED"
                  ? "Already in expenses"
                  : order.gift?.expenseId
                    ? "Logged as an expense"
                    : "No cost recorded"}
              </p>
            </div>
            <div className="surface px-5 py-4">
              <dt className="meta">Invoice</dt>
              <dd className="mt-1 font-[family-name:var(--font-display)] text-2xl">None</dd>
              <p className="mt-1 text-[0.75rem] text-ink-muted">Gifts do not issue invoices</p>
            </div>
          </>
        )}
        <div className="surface px-5 py-4">
          <dt className="meta">Order completed</dt>
          <dd className="mt-1">
            <OrderToggle
              kind="completion"
              orderId={order.id}
              type={order.type}
              status={order.status}
              paymentStatus={order.paymentStatus}
              canManage={canManage}
              canPay={canPayments}
            />
          </dd>
          <p className="mt-2 text-[0.75rem] text-ink-muted">
            Updated {formatDateTime(order.updatedAt)}
          </p>
        </div>
      </dl>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {order.comments ? (
            <section
              className="surface border-l-4 border-l-brass p-5"
              aria-labelledby="order-notes"
            >
              <h2
                id="order-notes"
                className="font-[family-name:var(--font-display)] text-xl"
              >
                Order note
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-[0.9375rem] text-ink-soft">
                {order.comments}
              </p>
            </section>
          ) : null}
          <section className="surface" aria-labelledby="order-items">
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-4">
              <h2 id="order-items" className="font-[family-name:var(--font-display)] text-xl">
                Items
              </h2>
              <span className="meta">{order.items.length} lines</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[38rem] text-left text-[0.9375rem]">
                <thead>
                  <tr className="border-b border-line text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Item
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Weight
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">
                      Qty
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">
                      Price
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-3">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-[0.8125rem] text-ink-muted">
                          {item.packagingLabel}
                          {item.notes ? ` · ${item.notes}` : ""}
                        </p>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {item.imported ? (
                          <span className="text-ink-muted">As imported</span>
                        ) : (
                          <>
                            {item.actualWeightGrams} g{" "}
                            <span className="text-[0.75rem] text-ink-muted">
                              {item.weightBasis === "PER_UNIT" ? "each" : "total"}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {item.quantityLabel ?? item.quantity}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        {item.imported
                          ? "—"
                          : formatINR(
                              item.basisPricePaise ??
                                (item.weightBasis === "PER_UNIT"
                                  ? Math.round(item.ratePerGramPaise * item.actualWeightGrams)
                                  : item.standardAmountPaise),
                            )}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        {formatINR(item.lineTotalPaise)}
                        {item.adjustmentPaise !== 0 ? (
                          <p className="text-[0.75rem] text-ink-muted">
                            incl. {formatINR(item.adjustmentPaise)} adjustment
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="space-y-1 border-t border-line px-5 py-4 text-[0.9375rem]">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd>{formatINR(order.subtotalPaise)}</dd>
              </div>
              {order.delivery.chargePaise > 0 ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">
                    Delivery · {DELIVERY_METHOD_LABELS[order.delivery.method]}
                  </dt>
                  <dd>{formatINR(order.delivery.chargePaise)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 border-t border-line pt-2 font-medium">
                <dt>{isGift ? "Gift value (not invoiced)" : "Total"}</dt>
                <dd>{formatINR(order.totalPaise)}</dd>
              </div>
            </dl>
          </section>

          {isSales ? (
            <section className="surface" aria-labelledby="order-payments">
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-4">
                <h2
                  id="order-payments"
                  className="font-[family-name:var(--font-display)] text-xl"
                >
                  Payments &amp; refunds
                </h2>
                <span className="meta">
                  {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                </span>
              </div>

              {entries.length === 0 ? (
                <p className="px-5 py-6 text-[0.9375rem] text-ink-soft">
                  No payments recorded yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[36rem] text-left text-[0.9375rem]">
                    <thead>
                      <tr className="border-b border-line text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
                        <th scope="col" className="px-5 py-3 font-semibold">
                          Entry
                        </th>
                        <th scope="col" className="px-5 py-3 font-semibold">
                          Date
                        </th>
                        <th scope="col" className="px-5 py-3 font-semibold">
                          Method
                        </th>
                        <th scope="col" className="px-5 py-3 text-right font-semibold">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {entries.map((entry) => (
                        <tr key={entry.id}>
                          <td className="px-5 py-3">
                            <p
                              className={
                                entry.kind === "Refund" ? "text-terracotta" : "font-medium"
                              }
                            >
                              {entry.kind}
                            </p>
                            <p className="text-[0.8125rem] text-ink-muted">
                              {entry.detail || "—"}
                              {entry.by ? ` · ${entry.by}` : ""}
                            </p>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            {formatDateDDMMYYYY(entry.date)}
                          </td>
                          <td className="px-5 py-3">{PAYMENT_METHOD_LABELS[entry.method]}</td>
                          <td
                            className={cn(
                              "px-5 py-3 text-right whitespace-nowrap",
                              entry.amountPaise < 0 && "text-terracotta",
                            )}
                          >
                            {formatINR(entry.amountPaise)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {canPayments || canRecordCost ? (
                <div className="grid gap-6 border-t border-line px-5 py-5 md:grid-cols-2">
                  {order.status !== "CANCELLED" && outstanding > 0 ? (
                    <form action={addPaymentAction} className="space-y-4">
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="idempotencyKey" value={randomUUID()} />
                    <h3 className="font-medium">Record a payment</h3>
                    <p className="text-[0.8125rem] text-ink-muted">
                      Outstanding: {formatINR(outstanding)}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label htmlFor="payment-amount" className="label">
                          Amount (₹)
                        </label>
                        <input
                          id="payment-amount"
                          name="amount"
                          inputMode="decimal"
                          required
                          max={outstanding / 100}
                          className="field"
                          placeholder={paiseToInput(outstanding)}
                        />
                      </div>
                      <div>
                        <label htmlFor="payment-method" className="label">
                          Method
                        </label>
                        <select id="payment-method" name="method" className="field">
                          {PAYMENT_METHODS.map((method) => (
                            <option key={method.value} value={method.value}>
                              {method.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="payment-date" className="label">
                          Received on
                        </label>
                        <input
                          id="payment-date"
                          name="date"
                          type="date"
                          defaultValue={businessToday()}
                          max={businessToday()}
                          className="field"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="payment-reference" className="label">
                          Reference (optional)
                        </label>
                        <input
                          id="payment-reference"
                          name="reference"
                          maxLength={120}
                          className="field"
                          placeholder="UPI reference"
                        />
                      </div>
                    </div>
                    <button type="submit" className="btn btn-solid btn-sm">
                      <ReceiptText aria-hidden="true" className="size-4" />
                      Record payment
                    </button>
                    </form>
                  ) : (
                    <p className="text-[0.8125rem] text-ink-muted">
                      {order.status === "CANCELLED"
                        ? "Cancelled orders take refunds only."
                        : "No outstanding balance — payments are complete."}
                    </p>
                  )}

                  {netReceived > 0 ? (
                    <form action={addRefundAction} className="space-y-4">
                      <input type="hidden" name="orderId" value={order.id} />
                      <input type="hidden" name="idempotencyKey" value={randomUUID()} />
                      <h3 className="font-medium">Record a refund</h3>
                      <p className="text-[0.8125rem] text-ink-muted">
                        Refundable: {formatINR(netReceived)}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label htmlFor="refund-amount" className="label">
                            Amount (₹)
                          </label>
                          <input
                            id="refund-amount"
                            name="amount"
                            inputMode="decimal"
                            required
                            max={netReceived / 100}
                            className="field"
                            placeholder={paiseToInput(netReceived)}
                          />
                        </div>
                        <div>
                          <label htmlFor="refund-method" className="label">
                            Method
                          </label>
                          <select id="refund-method" name="method" className="field">
                            {PAYMENT_METHODS.map((method) => (
                              <option key={method.value} value={method.value}>
                                {method.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="refund-date" className="label">
                            Refunded on
                          </label>
                          <input
                            id="refund-date"
                            name="date"
                            type="date"
                            defaultValue={businessToday()}
                            max={businessToday()}
                            className="field"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label htmlFor="refund-reason" className="label">
                            Reason
                          </label>
                          <input
                            id="refund-reason"
                            name="reason"
                            required
                            minLength={3}
                            maxLength={500}
                            className="field"
                            placeholder="Order cancelled by customer"
                          />
                        </div>
                      </div>
                      <button type="submit" className="btn btn-outline btn-sm">
                        Record refund
                      </button>
                    </form>
                  ) : null}

                  {canRecordCost ? (
                    <form action={addOrderExpenseAction} className="space-y-4">
                      <input type="hidden" name="orderId" value={order.id} />
                      <h3 className="font-medium">Add a cost for this order</h3>
                      <p className="text-[0.8125rem] text-ink-muted">
                        Something you paid out for this order — a courier slip, extra boxes. It
                        lands in Expenses tagged {order.ref}.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label htmlFor="order-cost-amount" className="label">
                            Amount (₹)
                          </label>
                          <input
                            id="order-cost-amount"
                            name="amount"
                            inputMode="decimal"
                            required
                            className="field"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label htmlFor="order-cost-date" className="label">
                            Paid on
                          </label>
                          <input
                            id="order-cost-date"
                            name="date"
                            type="date"
                            defaultValue={businessToday()}
                            max={businessToday()}
                            className="field"
                          />
                        </div>
                        <div>
                          <label htmlFor="order-cost-category" className="label">
                            Category
                          </label>
                          <select id="order-cost-category" name="category" defaultValue={costDefaultCategory} className="field">
                            {costCategories.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="order-cost-method" className="label">
                            Paid by (optional)
                          </label>
                          <select id="order-cost-method" name="method" defaultValue="" className="field">
                            <option value="">Not recorded</option>
                            {PAYMENT_METHODS.map((method) => (
                              <option key={method.value} value={method.value}>
                                {method.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label htmlFor="order-cost-description" className="label">
                            What was it?
                          </label>
                          <input
                            id="order-cost-description"
                            name="description"
                            maxLength={300}
                            className="field"
                            placeholder="Courier to Andheri, gift ribbon…"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label htmlFor="order-cost-supplier" className="label">
                            Supplier or payee (optional)
                          </label>
                          <input id="order-cost-supplier" name="supplier" maxLength={120} className="field" />
                        </div>
                      </div>
                      <button type="submit" className="btn btn-outline btn-sm">
                        <ReceiptText aria-hidden="true" className="size-4" />
                        Record cost
                      </button>
                    </form>
                  ) : null}
                </div>
              ) : null}

              {!canPayments ? (
                <p className="border-t border-line px-5 py-4 text-[0.8125rem] text-ink-muted">
                  Payment and refund entry needs the payments permission.
                </p>
              ) : null}
            </section>
          ) : null}

          {isSales && order.invoice ? (
            <section className="surface" aria-labelledby="invoice-versions">
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-4">
                <h2
                  id="invoice-versions"
                  className="font-[family-name:var(--font-display)] text-xl"
                >
                  Invoice versions
                </h2>
                <span className="meta">Dashboard downloads only</span>
              </div>
              <ul className="divide-y divide-line">
                {versionRows.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <FileText aria-hidden="true" className="size-4 text-brass" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        Version {row.version}
                        {row.supersededAt ? (
                          <span className="pill ml-2 border-line text-ink-muted">Superseded</span>
                        ) : (
                          <span className="pill ml-2 border-olive-soft text-olive">Latest</span>
                        )}
                      </p>
                      <p className="text-[0.8125rem] text-ink-muted">
                        Issued {formatDateTime(row.createdAt)}
                        {row.createdByName ? ` · ${row.createdByName}` : ""} · Invoice date{" "}
                        {formatDateDDMMYYYY(row.snapshot.invoiceDate)}
                      </p>
                    </div>
                    <a
                      href={`/admin/orders/${order.id}/invoice/${row.version}`}
                      className="btn btn-outline btn-sm"
                    >
                      <Download aria-hidden="true" className="size-4" />
                      PDF
                    </a>
                  </li>
                ))}
              </ul>
              <p className="border-t border-line px-5 py-3 text-[0.75rem] text-ink-muted">
                Invoices show order content only. Payments, balances and GST are not printed.
              </p>
            </section>
          ) : null}

          <section className="surface p-5 sm:p-6" aria-labelledby="status-history">
            <div className="flex items-center gap-2">
              <History aria-hidden="true" className="size-4 text-brass" />
              <h2
                id="status-history"
                className="font-[family-name:var(--font-display)] text-xl"
              >
                Status history
              </h2>
            </div>
            <ol className="mt-4 space-y-4">
              {order.statusHistory.map((entry, index) => (
                <li key={`${entry.at}-${index}`} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brass" />
                  <div>
                    <p className="font-medium">{ORDER_STATUS_HISTORY_LABELS[entry.status]}</p>
                    <p className="text-[0.8125rem] text-ink-muted">
                      {formatDateTime(entry.at)}
                      {entry.byName ? ` · ${entry.byName}` : ""}
                    </p>
                    {entry.note ? (
                      <p className="mt-1 text-[0.875rem] text-ink-soft">{entry.note}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>

            {canManage ? (
              <form
                action={changeOrderStatusAction}
                className="mt-5 space-y-3 border-t border-line pt-5"
              >
                <input type="hidden" name="orderId" value={order.id} />
                <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-end">
                  <div>
                    <label htmlFor="status" className="label">
                      New status
                    </label>
                    <select id="status" name="status" defaultValue={order.status} className="field">
                      {ORDER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {ORDER_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="status-note" className="label">
                      Note (optional)
                    </label>
                    <input
                      id="status-note"
                      name="note"
                      maxLength={500}
                      className="field"
                      placeholder="Completed and handed over"
                    />
                  </div>
                  <button type="submit" className="btn btn-outline btn-sm">
                    Update status
                  </button>
                </div>
              </form>
            ) : null}
          </section>
        </div>

        <div className="space-y-6">
          <section className="surface p-5" aria-labelledby="order-customer">
            <h2
              id="order-customer"
              className="font-[family-name:var(--font-display)] text-xl"
            >
              Customer
            </h2>
            <p className="mt-3 text-[1.0625rem] font-medium">{order.customerSnapshot.name}</p>
            <p className="text-[0.9375rem] text-ink-soft">{order.customerSnapshot.phone}</p>
            {order.customerSnapshot.email ? (
              <p className="break-all text-[0.9375rem] text-ink-soft">
                {order.customerSnapshot.email}
              </p>
            ) : null}
            {customer ? (
              <Link
                href={`/admin/customers/${customer.id}`}
                className="btn btn-outline btn-sm mt-4"
              >
                Open profile
              </Link>
            ) : null}
          </section>

          {hasDelivery ? (
            <section className="surface p-5" aria-labelledby="order-delivery">
              <h2
                id="order-delivery"
                className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl"
              >
                <Truck aria-hidden="true" className="size-4 text-brass" />
                Delivery
              </h2>
              <dl className="mt-3 space-y-2 text-[0.9375rem]">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Method</dt>
                  <dd>{DELIVERY_METHOD_LABELS[order.delivery.method]}</dd>
                </div>
                {!isGift ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-muted">Charge</dt>
                    <dd>{formatINR(order.delivery.chargePaise)}</dd>
                  </div>
                ) : null}
              </dl>
              {order.delivery.notes ? (
                <p className="mt-3 border-t border-line pt-3 whitespace-pre-wrap text-[0.875rem] text-ink-soft">
                  {order.delivery.notes}
                </p>
              ) : null}
            </section>
          ) : null}

          {isGift ? (
            <section className="surface p-5" aria-labelledby="order-gift">
              <h2
                id="order-gift"
                className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl"
              >
                <Gift aria-hidden="true" className="size-4 text-brass" />
                Gifting
              </h2>
              <dl className="mt-3 space-y-2 text-[0.9375rem]">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Cost</dt>
                  <dd>{formatINR(order.gift?.costPaise ?? 0)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Cost handling</dt>
                  <dd>
                    {order.gift?.treatment === "ALREADY_RECORDED"
                      ? "Already in expenses"
                      : order.gift?.expenseId
                        ? "New expense logged"
                        : "No expense"}
                  </dd>
                </div>
              </dl>
              {order.gift?.note ? (
                <p className="mt-3 border-t border-line pt-3 whitespace-pre-wrap text-[0.875rem] text-ink-soft">
                  {order.gift.note}
                </p>
              ) : null}
            </section>
          ) : null}

          {enquiry ? (
            <section className="surface p-5" aria-labelledby="order-enquiry">
              <h2
                id="order-enquiry"
                className="font-[family-name:var(--font-display)] text-xl"
              >
                Source enquiry
              </h2>
              <p className="mt-2 text-[0.9375rem] text-ink-soft">
                {enquiry.name} · {enquiry.quantityKg} kg
              </p>
              <Link
                href={`/admin/enquiries/${enquiry.id}`}
                className="btn btn-quiet btn-sm mt-3"
              >
                Open enquiry
              </Link>
            </section>
          ) : null}
        </div>
      </div>

      {isSales ? (
        <section className="surface" aria-labelledby="order-messages">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 id="order-messages" className="font-[family-name:var(--font-display)] text-xl">
                Customer messages
              </h2>
              <p className="mt-1 text-[0.8125rem] text-ink-muted">
                WhatsApp and email are sent manually from here. Nothing is attached except the
                text you write.
              </p>
            </div>
            <Link href="/admin/whatsapp" className="btn btn-quiet btn-sm">
              Messaging settings
            </Link>
          </div>

          <div className="grid divide-y divide-line lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            <div className="space-y-5 px-5 py-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="flex items-center gap-2 font-medium">
                  <MessageCircle aria-hidden="true" className="size-4 text-brass" />
                  WhatsApp
                </h3>
                <span className="pill border-line text-ink-muted">
                  {messageMode.mode === "LIVE" ? "Live" : "Test mode"}
                </span>
                {order.notificationSummary ? (
                  <span className="text-[0.75rem] text-ink-muted">
                    {order.notificationSummary.total} message
                    {order.notificationSummary.total === 1 ? "" : "s"}
                    {order.notificationSummary.failed > 0
                      ? ` · ${order.notificationSummary.failed} failed`
                      : ""}
                  </span>
                ) : null}
              </div>

              <div
                className={cn(
                  "border px-4 py-3 text-[0.8125rem]",
                  consent?.granted
                    ? "border-olive-soft text-ink-soft"
                    : consent
                      ? "border-terracotta text-terracotta"
                      : "border-brass text-ink-soft",
                )}
              >
                <p className="font-medium text-ink">
                  {consent?.granted
                    ? "WhatsApp consent recorded"
                    : consent
                      ? "WhatsApp consent withdrawn"
                      : "WhatsApp consent not recorded"}
                </p>
                <p className="mt-1">
                  {consent
                    ? `${consent.source} · ${formatDateTime(consent.at)}`
                    : "Record consent on the customer profile before sending."}
                </p>
                {customer ? (
                  <Link
                    href={`/admin/customers/${customer.id}`}
                    className="mt-2 inline-block underline underline-offset-2"
                  >
                    Manage consent
                  </Link>
                ) : null}
              </div>

              {!canMessage ? (
                <p className="text-[0.8125rem] text-ink-muted">
                  Sending messages needs the messaging permission.
                </p>
              ) : order.status !== "COMPLETED" ? (
                <p className="text-[0.8125rem] text-ink-muted">
                  Mark the order completed before messaging the customer.
                </p>
              ) : !consent?.granted ? (
                <p className="text-[0.8125rem] text-ink-muted">
                  Sending is blocked until consent is recorded.
                </p>
              ) : (
                <div className="space-y-4">
                  <form action={sendOrderMessageAction} className="flex flex-wrap items-center gap-3">
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="type" value="INVOICE_DETAILS" />
                    <input type="hidden" name="idempotencyKey" value={randomUUID()} />
                    <button type="submit" className="btn btn-solid btn-sm">
                      <Send aria-hidden="true" className="size-4" />
                      {messageMode.mode === "LIVE" ? "Send invoice details" : "Save test message"}
                    </button>
                    <span className="text-[0.75rem] text-ink-muted">
                      Uses the invoice-details template and the current order.
                    </span>
                  </form>
                  <form action={sendOrderMessageAction} className="space-y-2 border-t border-line pt-4">
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="type" value="CORRECTION" />
                    <input type="hidden" name="idempotencyKey" value={randomUUID()} />
                    <label htmlFor="correction-message" className="label">
                      Send a correction
                    </label>
                    <textarea
                      id="correction-message"
                      name="customMessage"
                      required
                      minLength={3}
                      maxLength={800}
                      rows={3}
                      className="field"
                      placeholder="For example: the delivery date moves to Friday, 2 May."
                    />
                    <button type="submit" className="btn btn-outline btn-sm">
                      <Send aria-hidden="true" className="size-4" />
                      Send correction
                    </button>
                  </form>
                </div>
              )}

              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <h4 className="text-[0.875rem] font-medium">WhatsApp history</h4>
                  <span className="meta">{notifications.length}</span>
                </div>
                {notifications.length === 0 ? (
                  <p className="mt-2 text-[0.8125rem] text-ink-muted">
                    No WhatsApp messages for this order yet.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {notifications.slice(0, 10).map((job) => (
                      <li key={job.id} className="border border-line px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("pill", MESSAGE_STATUS_STYLES[job.status])}>
                            {NOTIFICATION_STATUS_LABELS[job.status]}
                          </span>
                          <span className="text-[0.8125rem]">
                            {NOTIFICATION_TYPE_LABELS[job.type]}
                          </span>
                          <span className="text-[0.75rem] text-ink-muted">
                            {formatDateTime(job.createdAt)} ·{" "}
                            {job.mode === "LIVE" ? "live" : "test"}
                            {job.attempts > 0
                              ? ` · ${job.attempts} attempt${job.attempts === 1 ? "" : "s"}`
                              : ""}
                          </span>
                        </div>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-[0.8125rem] text-ink-soft">
                            View message
                          </summary>
                          <p className="mt-2 whitespace-pre-line border-t border-line pt-2 text-[0.8125rem] leading-relaxed text-ink-soft">
                            {job.body}
                          </p>
                        </details>
                        {job.holdReason ? (
                          <p className="mt-2 text-[0.75rem] text-brass">{job.holdReason}</p>
                        ) : null}
                        {job.lastError ? (
                          <p className="mt-1 text-[0.75rem] text-terracotta">{job.lastError}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {job.needsReview && canReviewMessages ? (
                            <form action={approveOrderMessageAction}>
                              <input type="hidden" name="jobId" value={job.id} />
                              <input type="hidden" name="orderId" value={order.id} />
                              <button type="submit" className="btn btn-solid btn-sm">
                                Approve
                              </button>
                            </form>
                          ) : null}
                          {job.needsReview ? (
                            <form action={rebuildOrderMessageAction}>
                              <input type="hidden" name="jobId" value={job.id} />
                              <input type="hidden" name="orderId" value={order.id} />
                              <button type="submit" className="btn btn-outline btn-sm">
                                <RefreshCw aria-hidden="true" className="size-3.5" />
                                Rebuild
                              </button>
                            </form>
                          ) : null}
                          {job.status === "FAILED" ? (
                            <form action={retryOrderMessageAction}>
                              <input type="hidden" name="jobId" value={job.id} />
                              <input type="hidden" name="orderId" value={order.id} />
                              <button type="submit" className="btn btn-outline btn-sm">
                                <RefreshCw aria-hidden="true" className="size-3.5" />
                                Retry
                              </button>
                            </form>
                          ) : null}
                          {["NEEDS_REVIEW", "QUEUED", "FAILED"].includes(job.status) ? (
                            <form action={discardOrderMessageAction}>
                              <input type="hidden" name="jobId" value={job.id} />
                              <input type="hidden" name="orderId" value={order.id} />
                              <button type="submit" className="btn btn-quiet btn-sm">
                                Discard
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {notifications.length > 10 ? (
                  <p className="mt-2 text-[0.75rem] text-ink-muted">
                    Showing the latest 10 of {notifications.length}. Open WhatsApp for the full
                    queue.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="flex items-center gap-2 font-medium">
                  <Mail aria-hidden="true" className="size-4 text-brass" />
                  Email
                </h3>
                <span className="pill border-line text-ink-muted">
                  {mailMode.mode === "LIVE" ? "Live" : "Test mode"}
                </span>
                {mailMode.sender ? (
                  <span className="truncate text-[0.75rem] text-ink-muted">
                    from {mailMode.sender}
                  </span>
                ) : null}
              </div>

              {canMessage ? (
                <form action={sendOrderEmailAction} className="space-y-3">
                  <input type="hidden" name="orderId" value={order.id} />
                  <div>
                    <label htmlFor="email-to" className="label">
                      To
                    </label>
                    <input
                      id="email-to"
                      name="to"
                      type="email"
                      required
                      maxLength={200}
                      defaultValue={emailDraft?.to ?? order.customerSnapshot.email ?? ""}
                      className="field"
                    />
                  </div>
                  <div>
                    <label htmlFor="email-subject" className="label">
                      Subject
                    </label>
                    <input
                      id="email-subject"
                      name="subject"
                      required
                      maxLength={200}
                      defaultValue={emailDraft?.subject ?? `Your GH Chikkis order — ${order.ref}`}
                      className="field"
                    />
                  </div>
                  <div>
                    <label htmlFor="email-body" className="label">
                      Body
                    </label>
                    <textarea
                      id="email-body"
                      name="body"
                      required
                      rows={12}
                      defaultValue={emailDraft?.body ?? ""}
                      className="field font-mono text-[0.8125rem] leading-relaxed"
                    />
                  </div>
                  <p className="text-[0.75rem] leading-relaxed text-ink-muted">
                    Plain text only. No PDF is attached — the invoice stays in the dashboard.
                    Nothing sends automatically.
                  </p>
                  <button type="submit" className="btn btn-solid btn-sm">
                    <Send aria-hidden="true" className="size-4" />
                    {mailMode.mode === "LIVE" ? "Send email" : "Save test email"}
                  </button>
                </form>
              ) : (
                <p className="text-[0.8125rem] text-ink-muted">
                  Sending emails needs the messaging permission.
                </p>
              )}

              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <h4 className="text-[0.875rem] font-medium">Email history</h4>
                  <span className="meta">{emails.length}</span>
                </div>
                {emails.length === 0 ? (
                  <p className="mt-2 text-[0.8125rem] text-ink-muted">
                    No emails for this order yet.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {emails.map((email) => (
                      <li key={email.id} className="border border-line px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("pill", EMAIL_STATUS_STYLES[email.status])}>
                            {email.status === "SIMULATED"
                              ? "Test — not sent"
                              : email.status === "SENT"
                                ? "Sent"
                                : "Failed"}
                          </span>
                          <span className="text-[0.75rem] text-ink-muted">
                            {formatDateTime(email.createdAt)}
                            {email.createdByName ? ` · ${email.createdByName}` : ""}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[0.8125rem] font-medium">{email.subject}</p>
                        <p className="text-[0.75rem] text-ink-muted">To {email.to}</p>
                        {email.error ? (
                          <p className="mt-1 text-[0.75rem] text-terracotta">{email.error}</p>
                        ) : null}
                        <details className="mt-2">
                          <summary className="cursor-pointer text-[0.8125rem] text-ink-soft">
                            View email
                          </summary>
                          <p className="mt-2 whitespace-pre-line border-t border-line pt-2 text-[0.8125rem] leading-relaxed text-ink-soft">
                            {email.body}
                          </p>
                        </details>
                        {email.status === "FAILED" && canMessage ? (
                          <form action={retryOrderEmailAction} className="mt-2">
                            <input type="hidden" name="emailId" value={email.id} />
                            <input type="hidden" name="orderId" value={order.id} />
                            <button type="submit" className="btn btn-outline btn-sm">
                              <RefreshCw aria-hidden="true" className="size-3.5" />
                              Retry email
                            </button>
                          </form>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
