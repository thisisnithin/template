// This file configures the initialization of Sentry on the server.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dataCollection: { userInfo: true },
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enableLogs: true,
  spotlight: process.env.NODE_ENV !== "production",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
});
