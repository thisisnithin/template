import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schemas/schema.ts",
  out: "./src/migrations",
  dialect: "postgresql",
  // biome-ignore lint/style/noNonNullAssertion: drizzle-kit CLI requires env var at config time
  dbCredentials: { url: process.env.DATABASE_URL! },
});
