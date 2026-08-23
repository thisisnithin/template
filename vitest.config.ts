import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@app/auth": path.resolve(import.meta.dirname, "packages/auth/src"),
      "@app/db": path.resolve(import.meta.dirname, "packages/db/src"),
      "@app/email": path.resolve(import.meta.dirname, "packages/email/src"),
      "@app/server": path.resolve(import.meta.dirname, "packages/server/src"),
      "@app/shared": path.resolve(import.meta.dirname, "packages/shared/src"),
    },
  },
  test: {
    env: {
      SKIP_ENV_VALIDATION: "1",
    },
    exclude: ["**/node_modules/**", ".context/**"],
    globalSetup: ["./vitest.global-setup.ts"],
    hookTimeout: 120_000,
    include: ["packages/**/src/**/*.test.ts"],
    passWithNoTests: true,
    pool: "forks",
    reporters: process.env.VERBOSE ? ["verbose"] : ["dot"],
    sequence: {
      hooks: "stack",
    },
    singleFork: true,
  },
});
