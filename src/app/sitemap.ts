import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { listPublishedDates } from "@/lib/content";
import { listActiveProducts } from "@/lib/products";
import type { ContentPageKey, Product } from "@/lib/types";

export const dynamic = "force-dynamic";

const PUBLIC_PAGES: {
  path: string;
  page: ContentPageKey;
  priority: number;
  changeFrequency: "weekly" | "monthly" | "yearly";
}[] = [
  { path: "/", page: "home", priority: 1, changeFrequency: "weekly" },
  { path: "/collection", page: "collection", priority: 0.9, changeFrequency: "weekly" },
  { path: "/gifting", page: "gifting", priority: 0.8, changeFrequency: "monthly" },
  { path: "/contact", page: "contact", priority: 0.8, changeFrequency: "monthly" },
  { path: "/our-story", page: "story", priority: 0.7, changeFrequency: "monthly" },
  { path: "/process", page: "process", priority: 0.6, changeFrequency: "monthly" },
  { path: "/faqs", page: "faqs", priority: 0.6, changeFrequency: "monthly" },
  { path: "/privacy", page: "privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", page: "terms", priority: 0.3, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let products: Product[] = [];
  let published: Record<string, Date> = {};
  try {
    [products, published] = await Promise.all([listActiveProducts(), listPublishedDates()]);
  } catch {
    products = [];
    published = {};
  }

  const fallback = new Date();
  const pages: MetadataRoute.Sitemap = PUBLIC_PAGES.map((item) => ({
    url: `${env.appUrl}${item.path}`,
    lastModified: published[item.page] ?? fallback,
    changeFrequency: item.changeFrequency,
    priority: item.priority,
  }));

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${env.appUrl}/collection/${product.slug}`,
    lastModified: new Date(product.updatedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...pages, ...productPages];
}
