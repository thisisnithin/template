import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside the app, so it cannot use @app/shared/env.
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is required to run drizzle-kit");
}

export default defineConfig({
  dbCredentials: { url },
  dialect: "postgresql",
  out: "./src/migrations",
  schema: "./src/schemas/schema.ts",
});
