import { posthog } from "posthog-js";
import { env } from "@/lib/env";

if (env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: "/ink",
    ui_host: "https://us.posthog.com",
    capture_exceptions: true,
  });
}
