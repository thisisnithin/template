import * as Sentry from "@sentry/nextjs";
import { patchConsole } from "./bin/patch-console";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }

  patchConsole();
}

export const onRequestError = Sentry.captureRequestError;
