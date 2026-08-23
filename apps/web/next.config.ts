import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  rewrites() {
    return [
      {
        destination: "https://us-assets.i.posthog.com/static/:path*",
        source: "/ink/static/:path*",
      },
      {
        destination: "https://us.i.posthog.com/:path*",
        source: "/ink/:path*",
      },
    ];
  },
  skipTrailingSlashRedirect: true,
  // pnpm hoists `next` above this app, so Turbopack needs the monorepo root.
  turbopack: {
    root: path.resolve(import.meta.dirname, "../.."),
  },
};

export default nextConfig;
