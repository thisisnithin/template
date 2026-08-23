import { ConvexConfigProvider } from "@confect/server";
import { Config, Effect } from "effect";

export const logLevel = Config.logLevel("LOG_LEVEL").pipe(
  Config.withDefault("Info" as const)
);

export const convexSiteUrl = Config.string("CONVEX_SITE_URL").pipe(
  Config.withDefault("")
);

export const siteUrl = Config.string("SITE_URL").pipe(
  Config.withDefault("http://localhost:3000")
);

export const dodo = Config.all({
  apiKey: Config.option(Config.redacted("DODO_PAYMENTS_API_KEY")),
  webhookSecret: Config.option(Config.redacted("DODO_PAYMENTS_WEBHOOK_SECRET")),
});

export const google = Config.all({
  clientId: Config.option(Config.string("GOOGLE_CLIENT_ID")),
  clientSecret: Config.option(Config.redacted("GOOGLE_CLIENT_SECRET")),
});

export const resend = Config.all({
  apiKey: Config.option(Config.redacted("RESEND_API_KEY")),
  fromEmail: Config.string("RESEND_FROM_EMAIL").pipe(
    Config.withDefault("onboarding@resend.dev")
  ),
});

export const config = Config.all({
  logLevel,
  convexSiteUrl,
  dodo,
  google,
  resend,
  siteUrl,
});

export const readSync = <A>(config_: Config.Config<A>): A =>
  Effect.runSync(
    config_.pipe(Effect.provide(ConvexConfigProvider.layer)) as Effect.Effect<A>
  );
