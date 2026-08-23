import { Effect, Layer } from "effect";
import type { Headers } from "effect/unstable/http";
import { UnauthorizedError } from "../../errors";
import { AuthMiddleware, CurrentUser } from "./auth.middleware";
import { BetterAuthClient } from "./better-auth.client";

export const AuthMiddlewareLayer = Layer.effect(
  AuthMiddleware,
  Effect.gen(function* () {
    const betterAuth = yield* BetterAuthClient;

    const getSession = Effect.fn("Auth.getSession")(function* (
      headers: Headers.Headers
    ) {
      const session = yield* betterAuth
        .use((client) => client.api.getSession({ headers }))
        .pipe(
          Effect.mapError(
            () =>
              new UnauthorizedError({ message: "Session validation failed" })
          )
        );

      if (!session) {
        return yield* new UnauthorizedError({
          message: "Invalid or expired session",
        });
      }

      return CurrentUser.of({
        email: session.user.email,
        id: session.user.id,
        image: session.user.image ?? null,
        name: session.user.name,
      });
    });

    return AuthMiddleware.of((next, { headers }) =>
      Effect.gen(function* () {
        const currentUser = yield* getSession(headers).pipe(
          Effect.withSpan("Auth.middleware")
        );

        return yield* next.pipe(
          Effect.provideService(CurrentUser, currentUser),
          Effect.annotateLogs({
            userEmail: currentUser.email,
            userId: currentUser.id,
          })
        );
      })
    );
  })
);
