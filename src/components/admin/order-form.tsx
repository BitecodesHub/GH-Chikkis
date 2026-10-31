"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { saveOrderAction, type OrderFormState } from "@/app/admin/orders/actions";
import { cn } from "@/lib/cn";
import { formatINR, paiseToInput } from "@/lib/money";
import {
  DELIVERY_METHODS,
  PAYMENT_METHODS,
  type DeliveryMethod,
  type Order,
  type OrderType,
  type WeightBasis,
} from "@/lib/types";

const EMPTY_STATE: OrderFormState = { ok: false };

export interface OrderProductOption {
  id: string;
  name: string;
  active: boolean;
  packaging: {
    id: string;
    label: string;
    grams: number;
    standardPricePaise: number | null;
  }[];
}

export interface OrderCustomerSummary {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface LineState {
  key: string;
  productId: string;
  packagingId: string;
  weight: string;
  basis: WeightBasis;
  quantity: string;
  rate: string;
  adjustment: string;
  notes: string;
}

function toRupees(paise: number): string {
  return paiseToInput(paise);
}

function parseMoney(value: string): number {
  const cleaned = value.replace(/[₹,\s]/g, "").trim();
  if (!cleaned) return 0;
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function initialLines(order?: Order): LineState[] {
  if (!order || order.items.length === 0) {
    return [
      {
        key: "line-1",
        productId: "",
        packagingId: "",
        weight: "",
        basis: "PER_UNIT",
        quantity: "1",
        rate: "",
        adjustment: "",
        notes: "",
      },
    ];
  }
  return order.items.map((item, index) => ({
    key: `line-${index + 1}`,
    productId: item.productId ?? "",
    packagingId: item.packagingId ?? "",
    weight: String(item.actualWeightGrams),
    basis: item.weightBasis,
    quantity: String(item.quantity),
    rate: toRupees(item.ratePerGramPaise),
    adjustment: item.adjustmentPaise ? toRupees(item.adjustmentPaise) : "",
    notes: item.notes ?? "",
  }));
}

function linePaise(line: LineState): number {
  const rate = parseMoney(line.rate);
  const grams = Number(line.weight);
  const quantity = Number(line.quantity);
  if (!rate || !Number.isFinite(grams) || grams <= 0) return 0;
  const multiplier = line.basis === "PER_UNIT" ? Math.max(quantity || 0, 0) : 1;
  const standard = rate * grams * multiplier;
  return Math.max(0, Math.round(standard) + parseMoney(line.adjustment));
}

export function OrderForm({
  mode,
  order,
  customer,
  products,
  today,
  enquiryId,
  enquirySummary,
  idempotencyKey,
}: {
  mode: "create" | "edit";
  order?: Order;
  customer: OrderCustomerSummary;
  products: OrderProductOption[];
  today: string;
  enquiryId?: string;
  enquirySummary?: string;
  idempotencyKey?: string;
}) {
  const [state, formAction, pending] = useActionState(saveOrderAction, EMPTY_STATE);
  const [type, setType] = useState<OrderType>(order?.type ?? "SALES");
  const [lines, setLines] = useState<LineState[]>(() => initialLines(order));
  const [orderDate, setOrderDate] = useState(order?.orderDate ?? today);
  const [expectedDate, setExpectedDate] = useState(order?.expectedDate ?? "");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(
    order?.delivery.method ?? "HOME_COLLECTION",
  );
  const [deliveryCharge, setDeliveryCharge] = useState(
    order?.delivery.chargePaise ? toRupees(order.delivery.chargePaise) : "",
  );
  const [deliveryNotes, setDeliveryNotes] = useState(order?.delivery.notes ?? "");
  const [comments, setComments] = useState(order?.comments ?? "");
  const [giftCost, setGiftCost] = useState(
    order?.gift?.costPaise ? toRupees(order.gift.costPaise) : "",
  );
  const [giftTreatment, setGiftTreatment] = useState(
    order?.gift?.treatment ?? "NEW_EXPENSE",
  );
  const [giftNote, setGiftNote] = useState(order?.gift?.note ?? "");
  const [initialAmount, setInitialAmount] = useState("");
  const [initialMethod, setInitialMethod] = useState("UPI");
  const [initialDate, setInitialDate] = useState(today);
  const [initialReference, setInitialReference] = useState("");
  const [initialNotes, setInitialNotes] = useState("");

  const isGift = type === "GIFT";
  const subtotal = lines.reduce((total, line) => total + linePaise(line), 0);
  const deliveryPaise = isGift ? 0 : parseMoney(deliveryCharge);
  const total = subtotal + deliveryPaise;
  const initialPaise = isGift ? 0 : parseMoney(initialAmount);
  const balanceAfterInitial = Math.max(total - initialPaise, 0);

  const payload = lines.map((line) => ({
    productId: line.productId,
    packagingId: line.packagingId || null,
    actualWeightGrams: Number(line.weight),
    weightBasis: line.basis,
    quantity: Number(line.quantity),
    ratePerGramPaise: parseMoney(line.rate),
    adjustmentPaise: parseMoney(line.adjustment),
    notes: line.notes,
  }));

  const updateLine = (key: string, patch: Partial<LineState>) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  };

  const chooseProduct = (line: LineState, productId: string) => {
    const product = products.find((entry) => entry.id === productId);
    const first = product?.packaging[0];
    updateLine(line.key, {
      productId,
      packagingId: first?.id ?? "",
      weight: first ? String(first.grams) : "",
      rate:
        first && first.standardPricePaise !== null
          ? toRupees(Math.round(first.standardPricePaise / first.grams))
          : "",
    });
  };

  const choosePackaging = (line: LineState, packagingId: string) => {
    const product = products.find((entry) => entry.id === line.productId);
    const option = product?.packaging.find((entry) => entry.id === packagingId);
    if (!option) {
      updateLine(line.key, { packagingId: "" });
      return;
    }
    updateLine(line.key, {
      packagingId,
      weight: String(option.grams),
      rate:
        option.standardPricePaise !== null
          ? toRupees(Math.round(option.standardPricePaise / option.grams))
          : line.rate,
    });
  };

  const addLine = () => {
    setLines((current) => [
      ...current,
      {
        key: `line-${Date.now()}-${current.length}`,
        productId: "",
        packagingId: "",
        weight: "",
        basis: "PER_UNIT",
        quantity: "1",
        rate: "",
        adjustment: "",
        notes: "",
      },
    ]);
  };

  const removeLine = (key: string) => {
    setLines((current) => (current.length > 1 ? current.filter((line) => line.key !== key) : current));
  };

  const chooseType = (next: OrderType) => {
    setType(next);
    if (next === "GIFT") {
      setDeliveryCharge("");
      setInitialAmount("");
    }
  };

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="orderId" value={order?.id ?? ""} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="customerId" value={customer.id} />
      <input type="hidden" name="orderDate" value={orderDate} />
      <input type="hidden" name="expectedDate" value={expectedDate} />
      <input type="hidden" name="deliveryMethod" value={deliveryMethod} />
      <input type="hidden" name="deliveryCharge" value={isGift ? "" : deliveryCharge} />
      <input type="hidden" name="deliveryNotes" value={deliveryNotes} />
      <input type="hidden" name="comments" value={comments} />
      <input type="hidden" name="giftCost" value={isGift ? giftCost : ""} />
      <input type="hidden" name="giftTreatment" value={giftTreatment} />
      <input type="hidden" name="giftNote" value={isGift ? giftNote : ""} />
      <input type="hidden" name="initialAmount" value={isGift ? "" : initialAmount} />
      <input type="hidden" name="initialMethod" value={initialMethod} />
      <input type="hidden" name="initialDate" value={initialDate} />
      <input type="hidden" name="initialReference" value={initialReference} />
      <input type="hidden" name="initialNotes" value={initialNotes} />
      <input type="hidden" name="items" value={JSON.stringify(payload)} />
      {enquiryId ? <input type="hidden" name="enquiryId" value={enquiryId} /> : null}
      {mode === "create" ? (
        <input type="hidden" name="idempotencyKey" value={idempotencyKey ?? ""} />
      ) : null}

      {enquirySummary ? (
        <p className="border border-brass/40 bg-paper-raised px-4 py-3 text-[0.875rem] text-ink-soft">
          {enquirySummary}
        </p>
      ) : null}

      {state.message ? (
        <p
          role={state.ok ? "status" : "alert"}
          className="border border-terracotta bg-paper-raised px-4 py-3 text-[0.875rem]"
        >
          {state.message}
        </p>
      ) : null}

      <section className="surface p-5 sm:p-6" aria-labelledby="order-type">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="order-type" className="font-[family-name:var(--font-display)] text-xl">
              Order type
            </h2>
            <p className="mt-1 text-[0.875rem] text-ink-soft">
              {isGift
                ? "Gifting records carry an internal cost, never revenue, and do not issue an invoice or take payments."
                : "Sales orders receive sequential invoice numbers and can take part-payments."}
            </p>
          </div>
          <div className="flex gap-2" role="group" aria-label="Order type">
            {(["SALES", "GIFT"] as const).map((option) => (
              <button
                key={option}
                type="button"
                disabled={mode === "edit"}
                aria-pressed={type === option}
                onClick={() => chooseType(option)}
                className={cn(
                  "btn btn-sm",
                  type === option ? "btn-solid" : "btn-outline",
                )}
              >
                {option === "SALES" ? "Sales" : "Gifting"}
              </button>
            ))}
          </div>
        </div>
        {mode === "edit" ? (
          <p className="help mt-3">The type cannot change after an order is saved.</p>
        ) : null}
      </section>

      <section className="surface p-5 sm:p-6" aria-labelledby="order-customer">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="order-customer"
              className="font-[family-name:var(--font-display)] text-xl"
            >
              Customer
            </h2>
            <p className="mt-2 text-[1.0625rem] font-medium">{customer.name}</p>
            <p className="text-[0.875rem] text-ink-soft">
              {customer.phone}
              {customer.email ? ` · ${customer.email}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mode === "create" ? (
              <Link
                href={enquiryId ? `/admin/orders/new?enquiryId=${enquiryId}` : "/admin/orders/new"}
                className="btn btn-quiet btn-sm"
              >
                Choose another customer
              </Link>
            ) : null}
            <Link href={`/admin/customers/${customer.id}`} className="btn btn-quiet btn-sm">
              Open profile
            </Link>
          </div>
        </div>
      </section>

      <section className="surface" aria-labelledby="order-lines">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 id="order-lines" className="font-[family-name:var(--font-display)] text-xl">
              Products
            </h2>
            <p className="mt-1 text-[0.8125rem] text-ink-muted">
              Prices are internal. Adjustments may be negative for a discount.
            </p>
          </div>
          <button type="button" onClick={addLine} disabled={lines.length >= 30} className="btn btn-outline btn-sm">
            <Plus aria-hidden="true" className="size-4" />
            Add line
          </button>
        </div>

        <div className="divide-y divide-line">
          {lines.map((line, index) => {
            const product = products.find((entry) => entry.id === line.productId);
            return (
              <div key={line.key} className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="meta">Line {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeLine(line.key)}
                    disabled={lines.length === 1}
                    className="btn btn-quiet btn-sm text-terracotta"
                    aria-label={`Remove line ${index + 1}`}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                    Remove
                  </button>
                </div>
                <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="md:col-span-2">
                    <label htmlFor={`product-${line.key}`} className="label">
                      Variety
                    </label>
                    <select
                      id={`product-${line.key}`}
                      value={line.productId}
                      onChange={(event) => chooseProduct(line, event.target.value)}
                      className="field"
                    >
                      <option value="">Choose a variety</option>
                      {products.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name}
                          {entry.active ? "" : " (paused)"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`packaging-${line.key}`} className="label">
                      Packaging
                    </label>
                    <select
                      id={`packaging-${line.key}`}
                      value={line.packagingId}
                      onChange={(event) => choosePackaging(line, event.target.value)}
                      className="field"
                      disabled={!product}
                    >
                      <option value="">Custom</option>
                      {product?.packaging.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label} · {option.grams} g
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`weight-${line.key}`} className="label">
                      Weight (g)
                    </label>
                    <input
                      id={`weight-${line.key}`}
                      value={line.weight}
                      onChange={(event) => updateLine(line.key, { weight: event.target.value })}
                      inputMode="decimal"
                      className="field"
                      placeholder="500"
                    />
                  </div>
                  <div>
                    <label htmlFor={`basis-${line.key}`} className="label">
                      Weight basis
                    </label>
                    <select
                      id={`basis-${line.key}`}
                      value={line.basis}
                      onChange={(event) =>
                        updateLine(line.key, { basis: event.target.value as WeightBasis })
                      }
                      className="field"
                    >
                      <option value="PER_UNIT">Weight per unit</option>
                      <option value="TOTAL">Total weight for line</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`quantity-${line.key}`} className="label">
                      Quantity
                    </label>
                    <input
                      id={`quantity-${line.key}`}
                      value={line.quantity}
                      onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                      inputMode="numeric"
                      className="field"
                    />
                  </div>
                  <div>
                    <label htmlFor={`rate-${line.key}`} className="label">
                      Rate per gram (₹)
                    </label>
                    <input
                      id={`rate-${line.key}`}
                      value={line.rate}
                      onChange={(event) => updateLine(line.key, { rate: event.target.value })}
                      inputMode="decimal"
                      className="field"
                      placeholder="0.90"
                    />
                  </div>
                  <div>
                    <label htmlFor={`adjustment-${line.key}`} className="label">
                      Adjustment (₹)
                    </label>
                    <input
                      id={`adjustment-${line.key}`}
                      value={line.adjustment}
                      onChange={(event) => updateLine(line.key, { adjustment: event.target.value })}
                      inputMode="decimal"
                      className="field"
                      placeholder="0"
                    />
                  </div>
                  <div className="md:col-span-2 xl:col-span-3">
                    <label htmlFor={`notes-${line.key}`} className="label">
                      Line notes (optional)
                    </label>
                    <input
                      id={`notes-${line.key}`}
                      value={line.notes}
                      onChange={(event) => updateLine(line.key, { notes: event.target.value })}
                      maxLength={500}
                      className="field"
                      placeholder="Cut into pieces, extra jaggery, gift wrapped…"
                    />
                  </div>
                  <div className="flex items-end justify-between gap-2 md:col-span-2 xl:col-span-1 xl:justify-end">
                    <span className="meta xl:hidden">Line total</span>
                    <p className="text-right font-[family-name:var(--font-display)] text-xl">
                      {formatINR(linePaise(line))}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="surface p-5 sm:p-6" aria-labelledby="order-delivery">
        <h2 id="order-delivery" className="font-[family-name:var(--font-display)] text-xl">
          Delivery &amp; dates
        </h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="orderDate" className="label">
              Order date
            </label>
            <input
              id="orderDate"
              type="date"
              value={orderDate}
              max={today}
              onChange={(event) => setOrderDate(event.target.value)}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="expectedDate" className="label">
              Expected date (optional)
            </label>
            <input
              id="expectedDate"
              type="date"
              value={expectedDate}
              onChange={(event) => setExpectedDate(event.target.value)}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="deliveryMethod" className="label">
              Delivery or collection
            </label>
            <select
              id="deliveryMethod"
              value={deliveryMethod}
              onChange={(event) => setDeliveryMethod(event.target.value as DeliveryMethod)}
              className="field"
            >
              {DELIVERY_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>
          {!isGift ? (
            <div>
              <label htmlFor="deliveryCharge" className="label">
                Delivery charge (₹)
              </label>
              <input
                id="deliveryCharge"
                value={deliveryCharge}
                onChange={(event) => setDeliveryCharge(event.target.value)}
                inputMode="decimal"
                className="field"
                placeholder="0"
              />
            </div>
          ) : null}
          <div className="md:col-span-2">
            <label htmlFor="deliveryNotes" className="label">
              Delivery notes (optional)
            </label>
            <input
              id="deliveryNotes"
              value={deliveryNotes}
              onChange={(event) => setDeliveryNotes(event.target.value)}
              maxLength={500}
              className="field"
              placeholder="Address, landmark, pickup time…"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="comments" className="label">
              Order notes (optional)
            </label>
            <textarea
              id="comments"
              value={comments}
              onChange={(event) => setComments(event.target.value)}
              maxLength={4000}
              rows={3}
              className="field"
              placeholder="Anything the team should remember about this order."
            />
          </div>
        </div>
      </section>

      {isGift ? (
        <section className="surface p-5 sm:p-6" aria-labelledby="order-gift">
          <h2 id="order-gift" className="font-[family-name:var(--font-display)] text-xl">
            Gifting cost
          </h2>
          <p className="mt-1 text-[0.875rem] text-ink-soft">
            The cost of this gift is excluded from sales and margin. Record it once, either here
            or in expenses.
          </p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="giftCost" className="label">
                Gifting cost (₹)
              </label>
              <input
                id="giftCost"
                value={giftCost}
                onChange={(event) => setGiftCost(event.target.value)}
                inputMode="decimal"
                className="field"
                placeholder="0"
              />
            </div>
            <fieldset>
              <legend className="label">How the cost is handled</legend>
              <label className="flex items-start gap-2 text-[0.9375rem]">
                <input
                  type="radio"
                  name="giftTreatmentChoice"
                  value="NEW_EXPENSE"
                  checked={giftTreatment === "NEW_EXPENSE"}
                  onChange={() => setGiftTreatment("NEW_EXPENSE")}
                  className="mt-1 size-4 accent-olive"
                />
                <span>
                  Create a new Gifting expense
                  <span className="help block">
                    The cost is added to expenses and reports automatically.
                  </span>
                </span>
              </label>
              <label className="mt-3 flex items-start gap-2 text-[0.9375rem]">
                <input
                  type="radio"
                  name="giftTreatmentChoice"
                  value="ALREADY_RECORDED"
                  checked={giftTreatment === "ALREADY_RECORDED"}
                  onChange={() => setGiftTreatment("ALREADY_RECORDED")}
                  className="mt-1 size-4 accent-olive"
                />
                <span>
                  Already recorded in expenses
                  <span className="help block">
                    No second expense is created. The gift still stays out of revenue.
                  </span>
                </span>
              </label>
            </fieldset>
            <div className="md:col-span-2">
              <label htmlFor="giftNote" className="label">
                Gifting note (optional)
              </label>
              <input
                id="giftNote"
                value={giftNote}
                onChange={(event) => setGiftNote(event.target.value)}
                maxLength={1000}
                className="field"
                placeholder="Diwali gift for the Sharma family, wrapped in brass paper…"
              />
            </div>
          </div>
        </section>
      ) : null}

      {!isGift && mode === "create" ? (
        <section className="surface p-5 sm:p-6" aria-labelledby="initial-payment">
          <h2
            id="initial-payment"
            className="font-[family-name:var(--font-display)] text-xl"
          >
            Initial payment (optional)
          </h2>
          <p className="mt-1 text-[0.875rem] text-ink-soft">
            Record money received with the order. More payments can be added later from the order
            page.
          </p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="initialAmount" className="label">
                Amount received (₹)
              </label>
              <input
                id="initialAmount"
                value={initialAmount}
                onChange={(event) => setInitialAmount(event.target.value)}
                inputMode="decimal"
                className="field"
                placeholder="Leave blank if nothing received"
              />
            </div>
            <div>
              <label htmlFor="initialMethod" className="label">
                Method
              </label>
              <select
                id="initialMethod"
                value={initialMethod}
                onChange={(event) => setInitialMethod(event.target.value)}
                className="field"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="initialDate" className="label">
                Received on
              </label>
              <input
                id="initialDate"
                type="date"
                value={initialDate}
                max={today}
                onChange={(event) => setInitialDate(event.target.value)}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="initialReference" className="label">
                Reference (optional)
              </label>
              <input
                id="initialReference"
                value={initialReference}
                onChange={(event) => setInitialReference(event.target.value)}
                maxLength={120}
                className="field"
                placeholder="UPI reference"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="initialNotes" className="label">
                Payment notes (optional)
              </label>
              <input
                id="initialNotes"
                value={initialNotes}
                onChange={(event) => setInitialNotes(event.target.value)}
                maxLength={1000}
                className="field"
              />
            </div>
          </div>
        </section>
      ) : null}

      <div className="sticky bottom-0 z-10 border-t border-line bg-paper/95 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-[0.875rem]">
            <div>
              <dt className="meta">Subtotal</dt>
              <dd className="font-medium">{formatINR(subtotal)}</dd>
            </div>
            {!isGift ? (
              <div>
                <dt className="meta">Delivery</dt>
                <dd className="font-medium">{formatINR(deliveryPaise)}</dd>
              </div>
            ) : null}
            <div>
              <dt className="meta">{isGift ? "Gift value (not invoiced)" : "Total"}</dt>
              <dd className="font-[family-name:var(--font-display)] text-xl">
                {formatINR(total)}
              </dd>
            </div>
            {!isGift && mode === "create" && initialPaise > 0 ? (
              <div>
                <dt className="meta">Balance after deposit</dt>
                <dd className="font-medium">{formatINR(balanceAfterInitial)}</dd>
              </div>
            ) : null}
          </dl>
          <div className="flex flex-wrap items-center gap-3">
            <p aria-live="polite" className="text-[0.8125rem] text-ink-muted">
              {pending ? "Saving…" : state.ok ? state.message : "Totals update as you type."}
            </p>
            <Link
              href={order ? `/admin/orders/${order.id}` : "/admin/orders"}
              className="btn btn-quiet btn-sm"
            >
              Cancel
            </Link>
            <button type="submit" disabled={pending} className="btn btn-solid btn-sm">
              {pending ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Save aria-hidden="true" className="size-4" />
              )}
              {mode === "create" ? "Save order" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
