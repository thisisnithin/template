import betterAuth from "@convex-dev/better-auth/convex.config";
import resend from "@convex-dev/resend/convex.config";
import posthog from "@posthog/convex/convex.config";
import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
  env: {
    POSTHOG_PROJECT_TOKEN: v.string(),
    POSTHOG_HOST: v.optional(v.string()),
    POSTHOG_PERSONAL_API_KEY: v.optional(v.string()),
  },
});

app.use(betterAuth);
app.use(resend);
app.use(posthog, {
  env: {
    POSTHOG_PROJECT_TOKEN: app.env.POSTHOG_PROJECT_TOKEN,
    POSTHOG_HOST: app.env.POSTHOG_HOST,
    POSTHOG_PERSONAL_API_KEY: app.env.POSTHOG_PERSONAL_API_KEY,
  },
});

export default app;
