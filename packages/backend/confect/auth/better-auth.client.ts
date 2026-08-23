import type { DataModel } from "@confect/server";
import type { GenericCtx } from "@convex-dev/better-auth";
import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { checkout, dodopayments, webhooks } from "@dodopayments/better-auth";
import { betterAuth } from "better-auth/minimal";
import DodoPayments from "dodopayments";
import { Config, Context, Effect, Layer, Option, Redacted } from "effect";
import { components } from "../_generated/components";
import type schemaDefinition from "../_generated/schema";
import authConfig from "../auth";
import { dodo, google, readSync, siteUrl } from "../config";

type ConvexDataModel = DataModel.ToConvex<
  DataModel.FromSchema<typeof schemaDefinition>
>;

const {
  dodo: dodoConfig,
  google: googleConfig,
  siteUrl: baseUrl,
} = readSync(Config.all({ dodo, google, siteUrl }));
const dodoKey = Option.map(dodoConfig.apiKey, Redacted.value);

export const authComponent = createClient<ConvexDataModel>(
  components.betterAuth
);

export const createAuth = (
  ctx: GenericCtx<ConvexDataModel>,
  { optionsOnly } = { optionsOnly: false }
) =>
  betterAuth({
    baseURL: baseUrl,
    database: authComponent.adapter(ctx),
    logger: { disabled: optionsOnly },
    emailAndPassword: { enabled: true },
    socialProviders: Option.isSome(googleConfig.clientId)
      ? {
          google: {
            clientId: googleConfig.clientId.value,
            clientSecret: Option.match(googleConfig.clientSecret, {
              onNone: () => "",
              onSome: Redacted.value,
            }),
          },
        }
      : {},
    plugins: [
      ...(Option.isSome(dodoKey)
        ? [
            dodopayments({
              client: new DodoPayments({ bearerToken: dodoKey.value }),
              use: [
                checkout(),
                webhooks({
                  webhookKey: Option.match(dodoConfig.webhookSecret, {
                    onNone: () => "",
                    onSome: Redacted.value,
                  }),
                }),
              ],
            }),
          ]
        : []),
      convex({ authConfig }),
    ],
  });

type AuthUser = Awaited<ReturnType<typeof authComponent.getAuthUser>>;
type AuthCtx = Parameters<typeof authComponent.getAuthUser>[0];

export class BetterAuthClient extends Context.Service<BetterAuthClient>()(
  "@auth/BetterAuthClient",
  {
    make: Effect.sync(() => {
      const getAuthUser: (ctx: AuthCtx) => Effect.Effect<AuthUser> = Effect.fn(
        "BetterAuthClient.getAuthUser"
      )(function* (ctx) {
        return yield* Effect.promise(() => authComponent.getAuthUser(ctx));
      });

      const use = Effect.fn("BetterAuthClient.use")(
        <A>(
          f: (client: typeof authComponent) => Promise<A>
        ): Effect.Effect<A> => Effect.promise(() => f(authComponent))
      );

      return { client: authComponent, getAuthUser, use } as const;
    }),
  }
) {
  static readonly layer = Layer.effect(BetterAuthClient, BetterAuthClient.make);
}
