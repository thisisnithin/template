import { PostHog } from "posthog-node";
import { env } from "@/lib/env";
import { patchConsole } from "./bin/patch-console";

const client = env.NEXT_PUBLIC_POSTHOG_KEY
  ? new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: env.NEXT_PUBLIC_POSTHOG_HOST,
    })
  : undefined;

export async function onRequestError(
  error: unknown,
  request: { path: string; method: string }
) {
  await client?.captureException(error, undefined, {
    path: request.path,
    method: request.method,
  });
}

export function register() {
  patchConsole();
}
