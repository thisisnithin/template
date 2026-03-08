import { env } from "@app/shared/env";
import posthog from "posthog-js";

export function initPostHog() {
  if (typeof window === "undefined" || !env.NEXT_PUBLIC_POSTHOG_KEY) {
    return;
  }

  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    defaults: "2026-01-30",
    loaded: (ph) => {
      if (process.env.NODE_ENV === "development") {
        ph.debug();
      }
    },
  });
}

export function identifyUser(user: {
  id: string;
  email: string;
  name: string;
}) {
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) {
    return;
  }
  posthog.identify(user.id, { email: user.email, name: user.name });
}

export function resetUser() {
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) {
    return;
  }
  posthog.reset();
}

export function captureEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) {
    return;
  }
  posthog.capture(event, properties);
}

export function getPostHog() {
  return posthog;
}
