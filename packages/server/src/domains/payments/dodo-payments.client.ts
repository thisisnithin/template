import { env } from "@app/shared/env";
import DodoPaymentsApi from "dodopayments";
import { Cause, Effect } from "effect";
import { DodoPaymentsError } from "./payments.errors";

export class DodoPaymentsClient extends Effect.Service<DodoPaymentsClient>()(
  "@payments/DodoPaymentsClient",
  {
    effect: Effect.gen(function* () {
      const client = new DodoPaymentsApi({
        bearerToken: env.DODO_PAYMENTS_API_KEY ?? "",
      });

      const use = Effect.fn("DodoPaymentsClient.use")(
        <A>(
          f: (client: DodoPaymentsApi, signal: AbortSignal) => Promise<A>
        ): Effect.Effect<A, DodoPaymentsError> =>
          Effect.tryPromise({
            try: (signal) => f(client, signal),
            catch: (cause) => new DodoPaymentsError({ cause }),
          }).pipe(
            Effect.tapError((error) =>
              Effect.logError(
                "Failed to call DodoPayments",
                Cause.fail(error)
              )
            )
          )
      );

      return { client, use } as const;
    }),
  }
) {}
