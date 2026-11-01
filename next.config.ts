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
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
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
