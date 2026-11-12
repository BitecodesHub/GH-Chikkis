import "server-only";
import { randomUUID } from "node:crypto";
import { cache } from "react";
import { getDb } from "./db";
import { nowIso } from "./dates";
import { invalidateReads, readThrough, READ_TTL } from "./read-cache";
import type { MediaAsset, PackagingOption, Product } from "./types";

export interface ProductDoc extends Omit<Product, "id"> {
  _id: string;
}

export interface ProductWriteInput {
  slug: string;
  name: string;
  description: string;
  tastingNote?: string;
  ingredients?: string;
  nutritionHighlights?: string;
  allergens?: string;
  ingredientsVerified: boolean;
  active: boolean;
  media: MediaAsset[];
  displayOrder: number;
  packaging: PackagingOption[];
}

export function mapProduct(doc: ProductDoc): Product {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

function isDuplicateKey(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000,
  );
}

const DUPLICATE_SLUG_MESSAGE =
  "That website address (slug) is already used by another variety.";

export const listActiveProducts = cache(async (): Promise<Product[]> => {
  return readThrough("products:active", READ_TTL.content, async () => {
    const db = await getDb();
    const docs = await db
      .collection<ProductDoc>("products")
      .find({ active: true })
      .sort({ displayOrder: 1, name: 1 })
      .toArray();
    return docs.map(mapProduct);
  });
});

export const getProductBySlug = cache(
  async (slug: string): Promise<Product | null> => {
    const products = await listActiveProducts();
    const match = products.find((product) => product.slug === slug);
    if (match) return match;
    return readThrough(`product:${slug}`, READ_TTL.content, async () => {
      const db = await getDb();
      const doc = await db.collection<ProductDoc>("products").findOne({ slug });
      return doc ? mapProduct(doc) : null;
    });
  },
);

export const listProducts = cache(async (): Promise<Product[]> => {
  return readThrough("products:all", READ_TTL.content, async () => {
    const db = await getDb();
    const docs = await db
      .collection<ProductDoc>("products")
      .find({})
      .sort({ active: -1, displayOrder: 1, name: 1 })
      .toArray();
    return docs.map(mapProduct);
  });
});

export const getProductById = cache(async (id: string): Promise<Product | null> => {
  const products = await listProducts();
  const match = products.find((product) => product.id === id);
  if (match) return match;
  return readThrough(`product:id:${id}`, READ_TTL.content, async () => {
    const db = await getDb();
    const doc = await db.collection<ProductDoc>("products").findOne({ _id: id });
    return doc ? mapProduct(doc) : null;
  });
});

export async function createProduct(input: ProductWriteInput): Promise<Product> {
  const db = await getDb();
  const existing = await db
    .collection<ProductDoc>("products")
    .findOne({ slug: input.slug });
  if (existing) throw new Error(DUPLICATE_SLUG_MESSAGE);

  const now = nowIso();
  const doc: ProductDoc = {
    _id: randomUUID(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await db.collection<ProductDoc>("products").insertOne(doc);
  } catch (error) {
    if (isDuplicateKey(error)) throw new Error(DUPLICATE_SLUG_MESSAGE);
    throw error;
  }
  invalidateReads("product");
  return mapProduct(doc);
}

export async function updateProduct(
  id: string,
  input: ProductWriteInput,
): Promise<Product> {
  const db = await getDb();
  const existing = await db.collection<ProductDoc>("products").findOne({ _id: id });
  if (!existing) throw new Error("This variety no longer exists.");

  const clash = await db
    .collection<ProductDoc>("products")
    .findOne({ slug: input.slug, _id: { $ne: id } });
  if (clash) throw new Error(DUPLICATE_SLUG_MESSAGE);

  const update = { ...input, updatedAt: nowIso() };
  try {
    await db
      .collection<ProductDoc>("products")
      .updateOne({ _id: id }, { $set: update });
  } catch (error) {
    if (isDuplicateKey(error)) throw new Error(DUPLICATE_SLUG_MESSAGE);
    throw error;
  }
  invalidateReads("product");
  return mapProduct({ ...existing, ...update });
}

/** Keeps a variety's price per kg so later orders start from it. Returns what changed. */
export async function saveSeasonPrices(
  prices: { productId: string; pricePerKgPaise: number }[],
): Promise<{ productId: string; name: string; from: number | null; to: number }[]> {
  const latest = new Map(prices.map((entry) => [entry.productId, entry.pricePerKgPaise]));
  if (latest.size === 0) return [];
  const db = await getDb();
  const collection = db.collection<ProductDoc>("products");
  const docs = await collection.find({ _id: { $in: [...latest.keys()] } }).toArray();
  const changes = docs
    .filter((doc) => doc.pricePerKgPaise !== latest.get(doc._id))
    .map((doc) => ({
      productId: doc._id,
      name: doc.name,
      from: doc.pricePerKgPaise ?? null,
      to: latest.get(doc._id) as number,
    }));
  if (changes.length === 0) return [];
  const now = nowIso();
  await collection.bulkWrite(
    changes.map((change) => ({
      updateOne: {
        filter: { _id: change.productId },
        update: { $set: { pricePerKgPaise: change.to, updatedAt: now } },
      },
    })),
  );
  invalidateReads("product");
  return changes;
}

export function nextDisplayOrder(products: Product[]): number {
  const highest = products.reduce(
    (max, product) => Math.max(max, product.displayOrder),
    0,
  );
  return Math.min(999, highest + 1);
}
