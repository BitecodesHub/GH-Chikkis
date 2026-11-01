import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/**
 * Read at request time, not baked into the build: prerendering this file is how
 * a deployment ends up telling Google its sitemap lives on localhost.
 */
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/login", "/api/"],
      },
    ],
    sitemap: `${env.appUrl}/sitemap.xml`,
    host: env.appUrl,
  };
}
