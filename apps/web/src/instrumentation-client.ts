// This file configures the initialization of Sentry on the client.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { posthog } from "posthog-js";

if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: "/ink",
    ui_host: "https://us.posthog.com",
  });
}

Sentry.init({
  dataCollection: { userInfo: true },
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enableLogs: true,
  integrations: [Sentry.replayIntegration()],
  replaysOnErrorSampleRate: 1,
  replaysSessionSampleRate: 0.1,
  spotlight: process.env.NODE_ENV !== "production",
  tracePropagationTargets: [process.env.NEXT_PUBLIC_APP_URL ?? ""],
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
