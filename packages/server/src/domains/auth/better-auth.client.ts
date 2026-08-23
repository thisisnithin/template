import type { Auth } from "@app/auth";
import { auth } from "@app/auth";
import { Cause, Context, Effect, Layer } from "effect";
import { BetterAuthError } from "./auth.errors";

export class BetterAuthClient extends Context.Service<BetterAuthClient>()(
  "@auth/BetterAuthClient",
  {
    make: Effect.sync(() => {
      const use = Effect.fn("BetterAuthClient.use")(
        <A>(
          f: (client: Auth) => Promise<A>
        ): Effect.Effect<A, BetterAuthError> =>
          Effect.tryPromise({
            try: () => f(auth),
            catch: (cause) => new BetterAuthError({ cause }),
          }).pipe(
            Effect.tapError((error) =>
              Effect.logError("Failed to call BetterAuth", Cause.fail(error))
            )
          )
      );

      return { client: auth, use } as const;
    }),
  }
) {
  static readonly layer = Layer.effect(BetterAuthClient, BetterAuthClient.make);
}
