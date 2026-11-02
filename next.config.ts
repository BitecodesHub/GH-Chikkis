import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  devIndicators: false,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  serverExternalPackages: ["mongodb"],
  headers: () => [
    // Vercel serves `public/` files with `must-revalidate`, so every photograph
    // on a page costs a trip to the function region. Five minutes at the edge
    // with a day of stale-serving keeps repeat visits instant while a swapped
    // picture still lands on the next fetch after the window opens.
    ...["products", "brand", "ingredients", "templates", "uploads"].map((dir) => ({
      source: `/${dir}/:path*`,
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
        },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ],
    })),
  ],
  experimental: {
    serverActions: {
      // The import desk and the media picker accept a 50 MB file. Vercel caps a
      // function body at 4.5 MB whatever is set here, so a large upload only
      // completes on a host without that ceiling.
      bodySizeLimit: "55mb",
    },
    // The proxy defaults to reading 10 MB of a request body and silently drops
    // the rest, so a 50 MB image would arrive truncated instead of rejected.
    proxyClientMaxBodySize: "55mb",
  },
  outputFileTracingIncludes: {
    "/admin/orders/**": ["./src/assets/fonts/**"],
    // The site chrome stats this file to decide whether the Owner's logo is in
    // place, so it has to survive into the serverless bundle.
    "/": ["./public/brand/**"],
    // The link-preview card reads its type and photograph off disk, and Vercel
    // only bundles files it can see a dependency on.
    "/og": ["./src/assets/fonts/**", "./public/products/**"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
