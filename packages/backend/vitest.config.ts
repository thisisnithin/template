import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // convex-test runs functions in a simulated Convex runtime.
    environment: "edge-runtime",
    include: ["confect/**/*.test.ts"],
    server: { deps: { inline: ["convex-test"] } },
  },
});
