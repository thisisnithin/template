import { type Auth, auth } from "@app/auth";
import { Cause, Effect } from "effect";
import { BetterAuthError } from "./auth.errors";

export class BetterAuthClient extends Effect.Service<BetterAuthClient>()(
  "@auth/BetterAuthClient",
  {
    sync: () => {
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
    },
  }
) {}
