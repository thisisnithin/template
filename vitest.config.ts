import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@app/server": path.resolve(import.meta.dirname, "packages/server/src"),
      "@app/db": path.resolve(import.meta.dirname, "packages/db/src"),
      "@app/shared": path.resolve(import.meta.dirname, "packages/shared/src"),
      "@app/auth": path.resolve(import.meta.dirname, "packages/auth/src"),
      "@app/email": path.resolve(import.meta.dirname, "packages/email/src"),
    },
  },
  test: {
    env: {
      SKIP_ENV_VALIDATION: "1",
    },
    globalSetup: ["./vitest.global-setup.ts"],
    include: ["packages/**/src/**/*.test.ts"],
    exclude: ["**/node_modules/**", ".context/**"],
    passWithNoTests: true,
    reporters: process.env.VERBOSE ? ["verbose"] : ["dot"],
    hookTimeout: 120_000,
    sequence: {
      hooks: "stack",
    },
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
