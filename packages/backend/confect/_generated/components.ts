import { componentsGeneric } from "convex/server";

export type Components = {
  "betterAuth": import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  "posthog": import("@posthog/convex/_generated/component.js").ComponentApi<"posthog">;
  "resend": import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
};

export const components: Components = componentsGeneric() as any;
