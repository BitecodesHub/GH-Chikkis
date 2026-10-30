import { cache } from "react";
import { getDb } from "./db";
import type { Product } from "./types";

export interface ProductDoc extends Omit<Product, "id"> {
  _id: string;
}

export function mapProduct(doc: ProductDoc): Product {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

export const listActiveProducts = cache(async (): Promise<Product[]> => {
  const db = await getDb();
  const docs = await db
    .collection<ProductDoc>("products")
    .find({ active: true })
    .sort({ displayOrder: 1, name: 1 })
    .toArray();
  return docs.map(mapProduct);
});

export const getProductBySlug = cache(
  async (slug: string): Promise<Product | null> => {
    const db = await getDb();
    const doc = await db
      .collection<ProductDoc>("products")
      .findOne({ slug });
    return doc ? mapProduct(doc) : null;
  },
);
