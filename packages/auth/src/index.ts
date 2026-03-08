import { makeDrizzle } from "@app/db/client";
import { env } from "@app/shared/env";
import { checkout, dodopayments, webhooks } from "@dodopayments/better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import DodoPayments from "dodopayments";

const db = makeDrizzle(env.DATABASE_URL);

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    ...(env.GOOGLE_CLIENT_ID
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
          },
        }
      : {}),
  },
  plugins: [
    ...(env.DODO_PAYMENTS_API_KEY
      ? [
          dodopayments({
            client: new DodoPayments({
              bearerToken: env.DODO_PAYMENTS_API_KEY,
            }),
            use: [
              checkout(),
              webhooks({
                webhookKey: env.DODO_PAYMENTS_WEBHOOK_SECRET ?? "",
              }),
            ],
          }),
        ]
      : []),
    nextCookies(), // must be last
  ],
});

export type Auth = typeof auth;
