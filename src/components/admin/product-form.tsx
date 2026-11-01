"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { saveProductAction, type ProductFormState } from "@/app/admin/products/actions";
import { MediaUploader } from "@/components/admin/media-uploader";
import { ProductArt } from "@/components/site/product-art";
import { cn } from "@/lib/cn";
import { paiseToInput } from "@/lib/money";
import type { MediaAsset, Product } from "@/lib/types";

interface PackagingRow {
  id: string;
  label: string;
  grams: string;
  price: string;
}

const EMPTY_STATE: ProductFormState = { ok: false };

function initialPackaging(product?: Product): PackagingRow[] {
  if (product && product.packaging.length > 0) {
    return product.packaging.map((option) => ({
      id: option.id,
      label: option.label,
      grams: String(option.grams),
      price: paiseToInput(option.standardPricePaise),
    }));
  }
  return [
    { id: "", label: "250 g", grams: "250", price: "" },
    { id: "", label: "500 g", grams: "500", price: "" },
  ];
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="error-text">
      {message}
    </p>
  );
}

export function ProductForm({
  mode,
  product,
  assets,
  nextDisplayOrder,
}: {
  mode: "create" | "edit";
  product?: Product;
  assets: MediaAsset[];
  nextDisplayOrder: number;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveProductAction, EMPTY_STATE);
  const [packaging, setPackaging] = useState<PackagingRow[]>(() => initialPackaging(product));
  const [library, setLibrary] = useState<MediaAsset[]>(() => {
    const list = [...assets];
    for (const asset of product?.media ?? []) {
      if (!list.some((item) => item.id === asset.id)) list.push(asset);
    }
    return list;
  });
  const [selected, setSelected] = useState<string[]>(
    () => product?.media.map((asset) => asset.id) ?? [],
  );
  const [active, setActive] = useState(product?.active ?? true);
  const [verified, setVerified] = useState(product?.ingredientsVerified ?? false);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  function updateRow(index: number, patch: Partial<PackagingRow>) {
    setPackaging((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    );
  }

  function toggleMedia(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 6) return current;
      return [...current, id];
    });
  }

  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="intent" value={mode} />
      {product ? <input type="hidden" name="productId" value={product.id} /> : null}
      <input type="hidden" name="packaging" value={JSON.stringify(packaging)} />
      <input type="hidden" name="mediaIds" value={JSON.stringify(selected)} />

      {state.message ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={cn(
            "border px-4 py-3 text-[0.875rem]",
            state.ok
              ? "border-olive bg-paper-raised text-ink"
              : "border-terracotta bg-paper-raised text-ink",
          )}
        >
          {state.message}
        </p>
      ) : null}

      <section className="surface p-5 sm:p-6" aria-labelledby="product-basics">
        <h2 id="product-basics" className="font-[family-name:var(--font-display)] text-xl">
          Basics
        </h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="product-name" className="label">
              Variety name
            </label>
            <input
              id="product-name"
              name="name"
              defaultValue={product?.name ?? ""}
              maxLength={120}
              required
              className={cn("field", errors.name && "field-error")}
            />
            <FieldError message={errors.name} />
          </div>

          <div>
            <label htmlFor="product-slug" className="label">
              Website address
            </label>
            <input
              id="product-slug"
              name="slug"
              defaultValue={product?.slug ?? ""}
              maxLength={80}
              placeholder="groundnut-chikki"
              className={cn("field", errors.slug && "field-error")}
            />
            <p className="help">
              Lowercase letters, numbers and hyphens. Leave blank to build it from the
              name.
            </p>
            <FieldError message={errors.slug} />
          </div>

          <div>
            <label htmlFor="product-order" className="label">
              Display order
            </label>
            <input
              id="product-order"
              name="displayOrder"
              type="number"
              min={0}
              max={999}
              step={1}
              defaultValue={product?.displayOrder ?? nextDisplayOrder}
              className={cn("field", errors.displayOrder && "field-error")}
            />
            <p className="help">Lower numbers appear first in the collection.</p>
            <FieldError message={errors.displayOrder} />
          </div>

          <div className="flex items-start gap-3 md:pt-8">
            <input
              id="product-active"
              name="active"
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              className="mt-1 size-4 accent-olive"
            />
            <div>
              <label htmlFor="product-active" className="text-[0.9375rem] font-medium">
                Listed on the website
              </label>
              <p className="help">
                Pause a variety to hide it from the public collection without deleting it.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="surface p-5 sm:p-6" aria-labelledby="product-story">
        <h2 id="product-story" className="font-[family-name:var(--font-display)] text-xl">
          Description & ingredients
        </h2>
        <div className="mt-5 space-y-5">
          <div>
            <label htmlFor="product-description" className="label">
              Description
            </label>
            <textarea
              id="product-description"
              name="description"
              defaultValue={product?.description ?? ""}
              maxLength={4000}
              rows={4}
              required
              className={cn("field", errors.description && "field-error")}
            />
            <p className="help">Shown on the variety page. Keep it factual.</p>
            <FieldError message={errors.description} />
          </div>

          <div>
            <label htmlFor="product-tasting" className="label">
              Tasting note
            </label>
            <input
              id="product-tasting"
              name="tastingNote"
              defaultValue={product?.tastingNote ?? ""}
              maxLength={300}
              placeholder="e.g. Deeply roasted groundnut, a clean snap, not too sweet."
              className="field"
            />
            <p className="help">A short line shown on the collection card.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="product-ingredients" className="label">
                Ingredients
              </label>
              <textarea
                id="product-ingredients"
                name="ingredients"
                defaultValue={product?.ingredients ?? ""}
                maxLength={2000}
                rows={3}
                className="field"
              />
              <p className="help">
                One item per line. Only shown publicly once the details have been verified below.
              </p>
            </div>
            <div>
              <label htmlFor="product-nutrition" className="label">
                Nutritional highlights
              </label>
              <textarea
                id="product-nutrition"
                name="nutritionHighlights"
                defaultValue={product?.nutritionHighlights ?? ""}
                maxLength={500}
                rows={3}
                className="field"
              />
              <p className="help">
                One per line, e.g. Protein, Vitamin E. Name nutrients the ingredients
                naturally carry — never a per-serving figure we cannot back.
              </p>
            </div>
            <div>
              <label htmlFor="product-allergens" className="label">
                Allergens
              </label>
              <textarea
                id="product-allergens"
                name="allergens"
                defaultValue={product?.allergens ?? ""}
                maxLength={500}
                rows={3}
                className="field"
              />
              <p className="help">e.g. Contains groundnuts. Made in a kitchen that handles nuts.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <input
              id="product-verified"
              name="ingredientsVerified"
              type="checkbox"
              checked={verified}
              onChange={(event) => setVerified(event.target.checked)}
              className="mt-1 size-4 accent-olive"
            />
            <div>
              <label htmlFor="product-verified" className="text-[0.9375rem] font-medium">
                Ingredients and allergens verified
              </label>
              <p className="help">
                Leave unticked to keep the public page&rsquo;s request-to-confirm note
                instead of showing these details.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="surface p-5 sm:p-6" aria-labelledby="product-packaging">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="product-packaging"
              className="font-[family-name:var(--font-display)] text-xl"
            >
              Packaging options
            </h2>
            <p className="mt-1 text-[0.875rem] text-ink-soft">
              Standard prices are internal only. They prefill order pricing and are never
              shown on the public website.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setPackaging((current) => [
                ...current,
                { id: "", label: "", grams: "", price: "" },
              ])
            }
            disabled={packaging.length >= 8}
            className="btn btn-outline btn-sm"
          >
            <Plus aria-hidden="true" className="size-4" />
            Add option
          </button>
        </div>

        <FieldError message={errors.packaging} />

        <div className="mt-5 space-y-3">
          {packaging.map((row, index) => (
            <div
              key={`${row.id || "new"}-${index}`}
              className="grid gap-3 border border-line p-3 sm:grid-cols-[minmax(8rem,1fr)_7rem_9rem_auto] sm:items-end"
            >
              <div>
                <label htmlFor={`pack-label-${index}`} className="label">
                  Label
                </label>
                <input
                  id={`pack-label-${index}`}
                  value={row.label}
                  onChange={(event) => updateRow(index, { label: event.target.value })}
                  maxLength={40}
                  placeholder="250 g"
                  className="field"
                />
              </div>
              <div>
                <label htmlFor={`pack-grams-${index}`} className="label">
                  Weight (g)
                </label>
                <input
                  id={`pack-grams-${index}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={row.grams}
                  onChange={(event) => updateRow(index, { grams: event.target.value })}
                  className="field"
                />
              </div>
              <div>
                <label htmlFor={`pack-price-${index}`} className="label">
                  Standard price (₹)
                </label>
                <input
                  id={`pack-price-${index}`}
                  inputMode="decimal"
                  value={row.price}
                  onChange={(event) => updateRow(index, { price: event.target.value })}
                  placeholder="Optional"
                  className="field"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setPackaging((current) => current.filter((_, i) => i !== index))
                }
                disabled={packaging.length === 1}
                className="btn btn-quiet btn-sm justify-self-start text-terracotta sm:justify-self-auto"
                aria-label={`Remove packaging option ${index + 1}`}
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="surface p-5 sm:p-6" aria-labelledby="product-photos">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="product-photos" className="font-[family-name:var(--font-display)] text-xl">
              Photographs
            </h2>
            <p className="mt-1 text-[0.875rem] text-ink-soft">
              Selected order is kept; the first image is the primary one. Up to six images.
            </p>
          </div>
          <span className="pill">{selected.length} of 6 selected</span>
        </div>

        {library.length === 0 ? (
          <div className="mt-5 rounded-sm border border-dashed border-line-strong px-5 py-8 text-center">
            <p className="text-[0.9375rem] font-medium">No photographs in the library yet.</p>
            <p className="mt-1 text-[0.875rem] text-ink-muted">
              The illustrated artwork will be used until you upload one.
            </p>
          </div>
        ) : (
          <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {library.map((asset) => {
              const index = selected.indexOf(asset.id);
              const isSelected = index >= 0;
              return (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => toggleMedia(asset.id)}
                    aria-pressed={isSelected}
                    className={cn(
                      "group block w-full text-left",
                      "focus-visible:outline-2 focus-visible:outline-offset-2",
                    )}
                  >
                    <div
                      className={cn(
                        "relative aspect-square overflow-hidden border bg-paper-deep",
                        isSelected ? "border-olive" : "border-line",
                      )}
                    >
                      <Image
                        src={asset.url}
                        alt={asset.alt}
                        fill
                        sizes="(min-width: 1024px) 18vw, (min-width: 640px) 28vw, 42vw"
                        className="object-cover"
                      />
                      {isSelected ? (
                        <span className="absolute top-2 left-2 grid size-6 place-items-center rounded-full bg-olive text-[0.6875rem] font-semibold text-paper">
                          {index + 1}
                        </span>
                      ) : null}
                      <span className="absolute inset-x-0 bottom-0 bg-ink/75 px-2 py-1 text-[0.6875rem] font-medium text-paper opacity-0 transition-opacity group-hover:opacity-100">
                        {isSelected ? "Selected — click to remove" : "Click to select"}
                      </span>
                    </div>
                    <span className="mt-2 line-clamp-2 block text-[0.8125rem] leading-snug text-ink-soft">
                      {asset.alt}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {selected.length === 0 ? (
          <div className="mt-4 flex items-center gap-4 border border-line p-3">
            <div className="w-20 shrink-0 border border-line">
              <ProductArt slug={product?.slug ?? "preview"} />
            </div>
            <p className="text-[0.8125rem] text-ink-muted">
              Without a photograph, the published page uses this illustrated artwork.
            </p>
          </div>
        ) : null}

        <div className="mt-5 border-t border-line pt-5">
          <MediaUploader
            compact
            onUploaded={(asset) => {
              setLibrary((current) => [asset, ...current]);
              setSelected((current) =>
                current.length >= 6 ? current : [...current, asset.id],
              );
            }}
          />
        </div>
        <FieldError message={errors.media} />
      </section>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper/95 py-3 backdrop-blur">
        <p aria-live="polite" className="text-[0.8125rem] text-ink-muted">
          {pending
            ? "Saving…"
            : state.ok
              ? state.message
              : mode === "create"
                ? "The variety appears in the collection as soon as it is saved."
                : "Changes take effect on the website immediately."}
        </p>
        <div className="flex gap-2">
          <Link
            href={product?.active ? `/collection/${product.slug}` : "/admin/products"}
            target={product?.active ? "_blank" : undefined}
            rel={product?.active ? "noreferrer" : undefined}
            className="btn btn-quiet btn-sm"
          >
            {product?.active ? "View page" : "Back"}
          </Link>
          <button type="submit" disabled={pending} className="btn btn-solid btn-sm">
            {pending ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Save aria-hidden="true" className="size-4" />
            )}
            {mode === "create" ? "Create variety" : "Save changes"}
          </button>
        </div>
      </div>
    </form>
  );
}
