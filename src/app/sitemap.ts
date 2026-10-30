import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { listActiveProducts } from "@/lib/products";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

const PUBLIC_PAGES: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/collection", priority: 0.9, changeFrequency: "weekly" },
  { path: "/our-story", priority: 0.7, changeFrequency: "monthly" },
  { path: "/process", priority: 0.6, changeFrequency: "monthly" },
  { path: "/gifting", priority: 0.8, changeFrequency: "monthly" },
  { path: "/faqs", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.8, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let products: Product[] = [];
  try {
    products = await listActiveProducts();
  } catch {
    products = [];
  }

  const now = new Date();
  const pages: MetadataRoute.Sitemap = PUBLIC_PAGES.map((page) => ({
    url: `${env.appUrl}${page.path}`,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${env.appUrl}/collection/${product.slug}`,
    lastModified: new Date(product.updatedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...pages, ...productPages];
}
