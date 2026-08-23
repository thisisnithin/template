import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";
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

export default withSentryConfig(nextConfig, {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  tunnelRoute: "/beacon",
  webpack: {
    automaticVercelMonitors: true,
    treeshake: { removeDebugLogging: true },
  },
  widenClientFileUpload: true,
});
