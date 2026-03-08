import { env } from "@app/shared/env";
import posthog from "posthog-js";

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
