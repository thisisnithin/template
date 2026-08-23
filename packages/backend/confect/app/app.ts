import { GroupSpec, MiddlewareSpec } from "@confect/core";
import { Context } from "effect";
import type { PostHogClient } from "../analytics/posthog.client";
import type { BetterAuthClient } from "../auth/better-auth.client";
import type { ResendClient } from "../email/resend.client";

export class App extends Context.Service<
  App,
  {
    readonly analytics: PostHogClient["Service"];
    readonly auth: BetterAuthClient["Service"];
    readonly mailer: ResendClient["Service"];
  }
>()("@app/App") {}

export class WithApp extends MiddlewareSpec.MiddlewareSpec<
  WithApp,
  { provides: App }
>()("WithApp", {
  functionTypes: { query: true, mutation: true, action: true },
}) {}

export const AppGroupSpec = {
  make: () => GroupSpec.make().middleware(WithApp),
  makeNode: () => GroupSpec.makeNode().middleware(WithApp),
};
