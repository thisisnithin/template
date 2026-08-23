import type { EmailId, SendEmailOptions } from "@convex-dev/resend";
import { Resend } from "@convex-dev/resend";
import { Context, Effect, Layer, Option } from "effect";
import { components } from "../_generated/components";
import { readSync, resend as resendConfig } from "../config";

type ResendCtx = Parameters<Resend["handleResendEventWebhook"]>[0];

export const resendComponent = new Resend(components.resend, {
  testMode: Option.isNone(readSync(resendConfig).apiKey),
});

export class ResendClient extends Context.Service<ResendClient>()(
  "@email/ResendClient",
  {
    make: Effect.sync(() => {
      const sendEmail: (
        ctx: ResendCtx,
        options: SendEmailOptions
      ) => Effect.Effect<EmailId> = Effect.fn("ResendClient.sendEmail")(
        function* (ctx, options) {
          return yield* Effect.promise(() =>
            resendComponent.sendEmail(ctx, options)
          );
        }
      );

      const use = Effect.fn("ResendClient.use")(
        <A>(f: (client: Resend) => Promise<A>): Effect.Effect<A> =>
          Effect.promise(() => f(resendComponent))
      );

      return { client: resendComponent, sendEmail, use } as const;
    }),
  }
) {
  static readonly layer = Layer.effect(ResendClient, ResendClient.make);
}
