"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, LoaderCircle, Minus, Plus, Save, X } from "lucide-react";
import { saveOrderAction, type OrderFormState } from "@/app/admin/orders/actions";
import { ProductPhoto } from "@/components/site/product-art";
import { cn } from "@/lib/cn";
import { formatINR, paiseToInput, parseRupeesToPaise, piecePriceFromKg } from "@/lib/money";
import {
  PAYMENT_METHODS,
  type Order,
  type OrderType,
  type WeightBasis,
} from "@/lib/types";

const EMPTY_STATE: OrderFormState = { ok: false };

/** The weights this kitchen actually sells by. */
const WEIGHT_PRESETS = [
  { grams: 250, label: "250 g" },
  { grams: 500, label: "500 g" },
  { grams: 1000, label: "1 kg" },
];

export interface OrderProductOption {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  image: string | null;
  /** The season's price per kg, or null until one is typed. */
  pricePerKgPaise: number | null;
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
  /** Price per kg in rupees, as typed or remembered. */
  kgPrice: string;
  /** A remembered price stays put until the owner deliberately unlocks it. */
  locked: boolean;
  /** Typed on this form, so it becomes the variety's price when the order saves. */
  edited: boolean;
  /** An older line priced per piece keeps its exact amount until it is changed. */
  fixedPiecePaise?: number;
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

// Most packaging labels already read "250 g", so printing the grams again
// beside them gives "250 g · 250 g".
function packagingText(
  option: OrderProductOption["packaging"][number],
  weight?: string,
): string {
  if (weight && weight !== String(option.grams)) {
    return `${option.label} · ${weight} g each`;
  }
  return option.label.includes(String(option.grams))
    ? option.label
    : `${option.label} · ${option.grams} g`;
}

function blankLine(key: string): LineState {
  return {
    key,
    productId: "",
    packagingId: "",
    weight: "",
    basis: "PER_UNIT",
    quantity: "1",
    kgPrice: "",
    locked: false,
    edited: false,
    adjustment: "",
    notes: "",
  };
}

function initialLines(order?: Order): LineState[] {
  if (!order || order.items.length === 0) {
    return [blankLine("line-1")];
  }
  return order.items.map((item, index) => {
    const piecePaise =
      item.basisPricePaise ??
      (item.weightBasis === "PER_UNIT"
        ? Math.round(item.ratePerGramPaise * item.actualWeightGrams)
        : item.standardAmountPaise);
    const kgPaise =
      item.pricePerKgPaise ??
      Math.round((piecePaise * 1000) / Math.max(item.actualWeightGrams, 1));
    return {
      key: `line-${index + 1}`,
      productId: item.productId ?? "",
      packagingId: item.packagingId ?? "",
      weight: String(item.actualWeightGrams),
      basis: item.weightBasis,
      quantity: String(item.quantity),
      kgPrice: toRupees(kgPaise),
      locked: true,
      edited: false,
      ...(item.pricePerKgPaise === undefined ? { fixedPiecePaise: piecePaise } : {}),
      adjustment: item.adjustmentPaise ? toRupees(item.adjustmentPaise) : "",
      notes: item.notes ?? "",
    };
  });
}

/** The price of one piece at the line's weight, or null until a price is set. */
function piecePaise(line: LineState): number | null {
  if (line.fixedPiecePaise !== undefined) return line.fixedPiecePaise;
  const grams = Number(line.weight);
  const kg = parseRupeesToPaise(line.kgPrice);
  if (kg === null || kg < 0 || !Number.isFinite(grams) || grams <= 0) return null;
  return piecePriceFromKg(kg, grams);
}

function linePaise(line: LineState): number {
  const base = piecePaise(line) ?? 0;
  const quantity = Number(line.quantity);
  const multiplier = line.basis === "PER_UNIT" ? Math.max(quantity || 0, 0) : 1;
  return Math.max(0, Math.round(base * multiplier) + parseMoney(line.adjustment));
}

function stepQuantity(value: string, delta: number): string {
  const current = Math.round(Number(value) || 0);
  return String(Math.min(999, Math.max(1, current + delta)));
}

function LineThumb({ product }: { product?: OrderProductOption }) {
  return (
    <span className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-line bg-paper-deep">
      {product ? (
        product.image ? (
          <Image src={product.image} alt="" fill sizes="48px" className="object-cover" />
        ) : (
          <ProductPhoto slug={product.slug} sizes="48px" />
        )
      ) : null}
    </span>
  );
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
  const nextLineKey = useRef((order?.items.length ?? 0) + 2);
  const weightRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const priceRefs = useRef<Record<string, HTMLInputElement | null>>({});
  // Prices typed on this form apply to further lines of the same variety.
  const [typedPrices, setTypedPrices] = useState<Record<string, number>>({});
  const [type, setType] = useState<OrderType>(order?.type ?? "SALES");
  const [lines, setLines] = useState<LineState[]>(() => initialLines(order));
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [orderDate, setOrderDate] = useState(order?.orderDate ?? today);
  const [expectedDate, setExpectedDate] = useState(order?.expectedDate ?? "");
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
  const initialPaise = isGift ? 0 : parseMoney(initialAmount);
  const balanceAfterInitial = Math.max(subtotal - initialPaise, 0);

  const payload = lines.map((line) => {
    const grams = Number(line.weight);
    const piece = piecePaise(line);
    const kg = parseRupeesToPaise(line.kgPrice);
    return {
      productId: line.productId,
      packagingId: line.packagingId || null,
      actualWeightGrams: grams,
      weightBasis: line.basis,
      quantity: Number(line.quantity),
      ratePerGramPaise: grams > 0 && piece !== null ? Math.round(piece / grams) : 0,
      basisPricePaise: piece,
      pricePerKgPaise: kg,
      rememberPrice: line.edited && kg !== null && kg > 0,
      adjustmentPaise: parseMoney(line.adjustment),
      notes: line.notes,
    };
  });

  const savedKgPaise = (product: OrderProductOption): number | null =>
    typedPrices[product.id] ?? product.pricePerKgPaise;

  const priceFields = (product: OrderProductOption): Partial<LineState> => {
    const saved = savedKgPaise(product);
    return {
      kgPrice: saved !== null ? toRupees(saved) : "",
      locked: saved !== null,
      edited: false,
      fixedPiecePaise: undefined,
    };
  };

  const updateLine = (key: string, patch: Partial<LineState>) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  };

  const applyPackaging = (
    product: OrderProductOption,
    packagingId: string,
  ): Partial<LineState> => {
    const option = product.packaging.find((entry) => entry.id === packagingId);
    if (!option) return { packagingId: "" };
    return { packagingId, weight: String(option.grams), fixedPiecePaise: undefined };
  };

  const chooseProduct = (line: LineState, productId: string) => {
    const product = products.find((entry) => entry.id === productId);
    if (!product) {
      updateLine(line.key, { productId });
      return;
    }
    const fields = priceFields(product);
    if (!fields.locked) setOpen((current) => ({ ...current, [line.key]: true }));
    updateLine(line.key, {
      productId,
      ...applyPackaging(product, product.packaging[0]?.id ?? ""),
      ...fields,
    });
  };

  const choosePackaging = (line: LineState, packagingId: string) => {
    const product = products.find((entry) => entry.id === line.productId);
    if (!product) {
      updateLine(line.key, { packagingId: "" });
      return;
    }
    updateLine(line.key, applyPackaging(product, packagingId));
  };

  /** A weight that matches a packaged option re-attaches it; anything else is custom. */
  const applyWeight = (line: LineState, value: string) => {
    const product = products.find((entry) => entry.id === line.productId);
    const match = product?.packaging.find((entry) => entry.grams === Number(value));
    updateLine(line.key, {
      weight: value,
      packagingId: match ? match.id : "",
      fixedPiecePaise: undefined,
    });
  };

  const typeKgPrice = (line: LineState, value: string) => {
    updateLine(line.key, { kgPrice: value, edited: true, fixedPiecePaise: undefined });
    const paise = parseRupeesToPaise(value);
    if (line.productId && paise !== null && paise > 0) {
      setTypedPrices((current) => ({ ...current, [line.productId]: paise }));
    }
  };

  const unlockPrice = (line: LineState) => {
    updateLine(line.key, { locked: false });
    const input = priceRefs.current[line.key];
    input?.focus();
    input?.select();
  };

  const chooseCustomWeight = (line: LineState) => {
    updateLine(line.key, { packagingId: "" });
    weightRefs.current[line.key]?.focus();
  };

  const addLine = () => {
    const key = `line-${nextLineKey.current++}`;
    setLines((current) => [...current, blankLine(key)]);
  };

  // One tap on a variety tile either adds it or bumps the count on the line
  // that already holds it, which is how 60 orders a day actually get keyed.
  const addFromTile = (product: OrderProductOption) => {
    const packagingId = product.packaging[0]?.id ?? "";
    const existing = lines.findIndex(
      (entry) => entry.productId === product.id && entry.packagingId === packagingId,
    );
    if (existing >= 0) {
      setLines((current) =>
        current.map((entry, index) =>
          index === existing
            ? { ...entry, quantity: stepQuantity(entry.quantity, 1) }
            : entry,
        ),
      );
      return;
    }
    const freshKey = `line-${nextLineKey.current++}`;
    const fresh = blankLine(freshKey);
    fresh.productId = product.id;
    fresh.packagingId = packagingId;
    const option = product.packaging.find((entry) => entry.id === packagingId);
    if (option) fresh.weight = String(option.grams);
    Object.assign(fresh, priceFields(product));
    if (!fresh.locked) {
      // Nothing to prefill, so put the price box in front of the owner instead
      // of leaving the line at ₹0 with the field hidden under Details.
      setOpen((current) => ({ ...current, [freshKey]: true }));
    }
    // The form opens with one empty line; a tap fills it rather than piling
    // a chosen line underneath a blank one.
    setLines((current) => {
      const blank = current.findIndex((entry) => !entry.productId);
      if (blank >= 0) {
        return current.map((entry, index) => (index === blank ? fresh : entry));
      }
      return [...current, fresh];
    });
  };

  const removeLine = (key: string) => {
    setLines((current) =>
      current.length > 1 ? current.filter((line) => line.key !== key) : current,
    );
  };

  const chooseType = (next: OrderType) => {
    setType(next);
    if (next === "GIFT") setInitialAmount("");
  };

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="orderId" value={order?.id ?? ""} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="customerId" value={customer.id} />
      <input type="hidden" name="orderDate" value={orderDate} />
      <input type="hidden" name="expectedDate" value={expectedDate} />
      {/* Collection is how this kitchen sells: the customer collects, or sends
          their own porter. The fields stay for invoices and old orders. */}
      <input type="hidden" name="deliveryMethod" value="HOME_COLLECTION" />
      <input type="hidden" name="deliveryCharge" value="" />
      <input type="hidden" name="deliveryNotes" value="" />
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

      <section
        className="surface flex flex-wrap items-center justify-between gap-4 p-4 sm:px-5"
        aria-labelledby="order-who"
      >
        <div className="min-w-0">
          <p className="meta">Customer</p>
          <p className="mt-1 truncate text-[1.0625rem] font-medium">{customer.name}</p>
          <p className="text-[0.8125rem] text-ink-soft">
            {customer.phone}
            {customer.email ? ` · ${customer.email}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-full bg-paper-deep p-1" role="group" aria-label="Order type">
            {(["SALES", "GIFT"] as const).map((option) => (
              <button
                key={option}
                type="button"
                disabled={mode === "edit"}
                aria-pressed={type === option}
                onClick={() => chooseType(option)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[0.8125rem] font-medium transition-colors",
                  type === option ? "bg-olive text-paper" : "text-ink-soft hover:bg-white/60",
                )}
              >
                {option === "SALES" ? "Sale" : "Gift"}
              </button>
            ))}
          </div>
          {mode === "create" ? (
            <Link
              href={enquiryId ? `/admin/orders/new?enquiryId=${enquiryId}` : "/admin/orders/new"}
              className="btn btn-quiet btn-sm"
            >
              Change
            </Link>
          ) : null}
          <Link href={`/admin/customers/${customer.id}`} className="btn btn-quiet btn-sm">
            Profile
          </Link>
        </div>
      </section>
      <p id="order-who" className="sr-only">
        Customer and order type
      </p>

      <section className="surface" aria-labelledby="order-lines">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 id="order-lines" className="font-[family-name:var(--font-display)] text-xl">
              Products
            </h2>
            <p className="mt-1 text-[0.8125rem] text-ink-muted">
              Tap a variety to add it. Tap it again for another one.
            </p>
            {products.length > 0 &&
            products.every((product) => savedKgPaise(product) === null) ? (
              <p className="mt-2 text-[0.8125rem] text-terracotta">
                No variety has a price per kg yet. Type it once on a line — it is kept for
                later orders.
              </p>
            ) : null}
          </div>
          <button type="button" onClick={addLine} disabled={lines.length >= 30} className="btn btn-quiet btn-sm">
            <Plus aria-hidden="true" className="size-4" />
            Custom line
          </button>
        </div>

        {products.length > 0 ? (
          <ul className="flex flex-wrap gap-2 border-b border-line p-4">
            {products.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => addFromTile(product)}
                  title={product.active ? `Add ${product.name}` : `${product.name} is paused`}
                  className="w-[5.5rem] rounded-xl border border-line bg-paper-raised p-1.5 text-left transition-colors hover:border-brass hover:bg-paper-deep"
                >
                  <span className="relative block aspect-square overflow-hidden rounded-lg bg-paper-deep">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt=""
                        fill
                        sizes="84px"
                        className="object-cover"
                      />
                    ) : (
                      <ProductPhoto slug={product.slug} sizes="84px" />
                    )}
                  </span>
                  <span className="mt-1 block truncate text-[0.75rem] font-medium leading-tight">
                    {product.name}
                  </span>
                  <span className="block truncate text-[0.6875rem] text-ink-muted">
                    {product.active
                      ? savedKgPaise(product) !== null
                        ? `${formatINR(savedKgPaise(product) as number)}/kg`
                        : product.packaging[0]
                          ? `${product.packaging[0].grams} g`
                          : "add"
                      : "paused"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <ul className="divide-y divide-line">
          {lines.map((line, index) => {
            const product = products.find((entry) => entry.id === line.productId);
            const option = product?.packaging.find((entry) => entry.id === line.packagingId);
            const detailsOpen = Boolean(open[line.key]);
            const piece = piecePaise(line);
            const kgPaise = parseRupeesToPaise(line.kgPrice);
            return (
              <li key={line.key}>
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <LineThumb product={product} />

                  <div className="min-w-[9rem] max-w-[22rem] flex-1">
                    <label className="sr-only" htmlFor={`product-${line.key}`}>
                      Variety for line {index + 1}
                    </label>
                    <select
                      id={`product-${line.key}`}
                      value={line.productId}
                      onChange={(event) => chooseProduct(line, event.target.value)}
                      className="w-full truncate border-0 bg-transparent p-0 text-[0.9375rem] font-medium text-ink focus:outline-none focus:ring-0"
                    >
                      <option value="">Choose a variety</option>
                      {products.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name}
                          {entry.active ? "" : " (paused)"}
                        </option>
                      ))}
                    </select>
                    {product && product.packaging.length > 1 ? (
                      <select
                        aria-label={`Packaging for line ${index + 1}`}
                        value={line.packagingId}
                        onChange={(event) => choosePackaging(line, event.target.value)}
                        className="mt-0.5 w-full border-0 bg-transparent p-0 text-[0.8125rem] text-ink-soft focus:outline-none focus:ring-0"
                      >
                        <option value="">Custom weight</option>
                        {product.packaging.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {packagingText(entry)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
                        {option ? packagingText(option, line.weight) : line.weight ? `${line.weight} g` : "Set a weight"}
                        {kgPaise !== null && kgPaise > 0 ? ` · ${formatINR(kgPaise)}/kg` : ""}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 rounded-full border border-line bg-paper-raised p-1">
                    <button
                      type="button"
                      onClick={() => updateLine(line.key, { quantity: stepQuantity(line.quantity, -1) })}
                      className="grid size-7 place-items-center rounded-full text-ink-soft transition-colors hover:bg-white"
                      aria-label={`One fewer on line ${index + 1}`}
                    >
                      <Minus aria-hidden="true" className="size-3.5" />
                    </button>
                    <input
                      value={line.quantity}
                      onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                      inputMode="numeric"
                      aria-label={`Quantity for line ${index + 1}`}
                      className="w-9 border-0 bg-transparent p-0 text-center text-[0.9375rem] font-medium focus:outline-none focus:ring-0"
                    />
                    <button
                      type="button"
                      onClick={() => updateLine(line.key, { quantity: stepQuantity(line.quantity, 1) })}
                      className="grid size-7 place-items-center rounded-full text-ink-soft transition-colors hover:bg-white"
                      aria-label={`One more on line ${index + 1}`}
                    >
                      <Plus aria-hidden="true" className="size-3.5" />
                    </button>
                  </div>

                  <p className="w-[5.5rem] shrink-0 text-right font-[family-name:var(--font-display)] text-[1.0625rem]">
                    {formatINR(linePaise(line))}
                  </p>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setOpen((current) => ({ ...current, [line.key]: !current[line.key] }))}
                      aria-expanded={detailsOpen}
                      className="btn btn-quiet btn-sm px-2"
                    >
                      <ChevronDown
                        aria-hidden="true"
                        className={cn("size-4 transition-transform", detailsOpen && "rotate-180")}
                      />
                      Details
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      disabled={lines.length === 1}
                      className="grid size-8 place-items-center rounded-full text-terracotta transition-colors hover:bg-terracotta/10 disabled:opacity-30"
                      aria-label={`Remove line ${index + 1}`}
                    >
                      <X aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                </div>

                {detailsOpen ? (
                  <div className="grid gap-4 border-t border-line bg-paper-deep/40 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label htmlFor={`weight-${line.key}`} className="label">
                        Weight (g)
                      </label>
                      <input
                        id={`weight-${line.key}`}
                        ref={(element) => {
                          weightRefs.current[line.key] = element;
                        }}
                        value={line.weight}
                        onChange={(event) => applyWeight(line, event.target.value)}
                        inputMode="decimal"
                        className="field"
                        placeholder="500"
                      />
                      <div className="mt-2 flex flex-wrap gap-1" role="group" aria-label="Quick weights">
                        {WEIGHT_PRESETS.map((preset) => (
                          <button
                            key={preset.grams}
                            type="button"
                            onClick={() => applyWeight(line, String(preset.grams))}
                            aria-pressed={Number(line.weight) === preset.grams}
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-[0.75rem] font-medium transition-colors",
                              Number(line.weight) === preset.grams
                                ? "border-olive bg-olive text-paper"
                                : "border-line text-ink-soft hover:bg-paper-raised",
                            )}
                          >
                            {preset.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => chooseCustomWeight(line)}
                          aria-pressed={Boolean(line.productId) && line.packagingId === ""}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-[0.75rem] font-medium transition-colors",
                            Boolean(line.productId) && line.packagingId === ""
                              ? "border-olive bg-olive text-paper"
                              : "border-line text-ink-soft hover:bg-paper-raised",
                          )}
                        >
                          Custom
                        </button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor={`kg-price-${line.key}`} className="label">
                        Price per kg (₹)
                      </label>
                      <input
                        id={`kg-price-${line.key}`}
                        ref={(element) => {
                          priceRefs.current[line.key] = element;
                        }}
                        value={line.kgPrice}
                        readOnly={line.locked}
                        onChange={(event) => typeKgPrice(line, event.target.value)}
                        onDoubleClick={() => (line.locked ? unlockPrice(line) : undefined)}
                        inputMode="decimal"
                        className={cn("field", line.locked && "cursor-pointer bg-paper-deep/60")}
                        title={line.locked ? "Double-click to change this price" : undefined}
                        placeholder="Price for 1 kg"
                        disabled={!line.weight}
                      />
                      <p className="mt-2 text-[0.75rem] leading-snug text-ink-muted">
                        {line.locked ? (
                          <>
                            Saved price.{" "}
                            <button
                              type="button"
                              onClick={() => unlockPrice(line)}
                              className="font-medium text-olive underline decoration-olive/40 underline-offset-2"
                            >
                              Change price
                            </button>
                          </>
                        ) : line.edited ? (
                          "Kept for this variety's later orders once you save."
                        ) : null}
                        {piece !== null && Number(line.weight) > 0 ? (
                          <span className="block">
                            {line.weight} g {line.basis === "PER_UNIT" ? "piece" : "total"} ={" "}
                            {formatINR(piece)}
                          </span>
                        ) : null}
                      </p>
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
                      <p className="mt-2 text-[0.75rem] leading-snug text-ink-muted">
                        Adds to the line; use a negative number for a discount.
                      </p>
                    </div>
                    <p className="help sm:col-span-2 lg:col-span-3">
                      Prices are per kg; each piece is worked out from its weight. A price you
                      type is remembered for that variety, so later orders fill it in — double-click
                      it or tap Change price when the rate changes. Prices stay internal.
                    </p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {isGift ? (
        <section className="surface p-5" aria-labelledby="order-gift">
          <h2 id="order-gift" className="font-[family-name:var(--font-display)] text-xl">
            Gifting cost
          </h2>
          <p className="mt-1 text-[0.875rem] text-ink-soft">
            A gift never issues an invoice and never counts as revenue. Record its cost once,
            here or in expenses.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="giftCost" className="label">
                Cost (₹)
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
            <div>
              <label htmlFor="giftTreatment" className="label">
                How the cost is handled
              </label>
              <select
                id="giftTreatment"
                value={giftTreatment}
                onChange={(event) =>
                  setGiftTreatment(event.target.value as "NEW_EXPENSE" | "ALREADY_RECORDED")
                }
                className="field"
              >
                <option value="NEW_EXPENSE">Create a gifting expense</option>
                <option value="ALREADY_RECORDED">Already recorded in expenses</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="giftNote" className="label">
                Note (optional)
              </label>
              <input
                id="giftNote"
                value={giftNote}
                onChange={(event) => setGiftNote(event.target.value)}
                maxLength={1000}
                className="field"
                placeholder="Diwali gift for the Sharma family…"
              />
            </div>
          </div>
        </section>
      ) : null}

      {!isGift && mode === "create" ? (
        <section className="surface p-5" aria-labelledby="initial-payment">
          <h2 id="initial-payment" className="font-[family-name:var(--font-display)] text-xl">
            Money received{" "}
            <span className="text-[0.8125rem] font-normal text-ink-muted">(optional)</span>
          </h2>
          <p className="mt-1 text-[0.875rem] text-ink-soft">
            Leave the amount blank if nothing has come in yet.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div className="w-40">
              <label htmlFor="initialAmount" className="label">
                Amount (₹)
              </label>
              <input
                id="initialAmount"
                value={initialAmount}
                onChange={(event) => setInitialAmount(event.target.value)}
                inputMode="decimal"
                className="field"
                placeholder="0"
              />
            </div>
            <div className="flex gap-1 rounded-full bg-paper-deep p-1" role="group" aria-label="Payment method">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  aria-pressed={initialMethod === method.value}
                  onClick={() => setInitialMethod(method.value)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[0.8125rem] font-medium transition-colors",
                    initialMethod === method.value
                      ? "bg-olive text-paper"
                      : "text-ink-soft hover:bg-white/60",
                  )}
                >
                  {method.label}
                </button>
              ))}
            </div>
            {initialPaise > 0 ? (
              <p className="text-[0.875rem] text-ink-soft">
                Balance after this: <strong>{formatINR(balanceAfterInitial)}</strong>
              </p>
            ) : null}
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-[0.8125rem] text-ink-muted">
              Receipt date and reference
            </summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
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
                  Reference
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
              <div>
                <label htmlFor="initialNotes" className="label">
                  Payment note
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
          </details>
        </section>
      ) : null}

      <section className="surface p-5" aria-labelledby="order-note">
        <h2 id="order-note" className="font-[family-name:var(--font-display)] text-xl">
          Order note and dates
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="comments" className="label">
              Order note (optional)
            </label>
            <textarea
              id="comments"
              value={comments}
              onChange={(event) => setComments(event.target.value)}
              maxLength={4000}
              rows={2}
              className="field"
              placeholder="Anything the team should remember about this order."
            />
          </div>
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
              Ready by (optional)
            </label>
            <input
              id="expectedDate"
              type="date"
              value={expectedDate}
              onChange={(event) => setExpectedDate(event.target.value)}
              className="field"
            />
          </div>
        </div>
      </section>

      <div className="sticky bottom-0 z-10 border-t border-line bg-paper/95 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <div>
              <p className="meta">Total</p>
              <p className="font-[family-name:var(--font-display)] text-2xl">
                {formatINR(subtotal)}
              </p>
            </div>
            <p className="text-[0.8125rem] text-ink-muted">
              {lines.length} {lines.length === 1 ? "line" : "lines"}
              {isGift ? " · gifting, not invoiced" : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p aria-live="polite" className="text-[0.8125rem] text-ink-muted">
              {pending ? "Saving…" : state.ok ? state.message : ""}
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
