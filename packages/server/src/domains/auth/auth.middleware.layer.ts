import type { Headers } from "@effect/platform";
import { Effect, Layer } from "effect";
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
        .use((client) => {
          return client.api.getSession({ headers });
        })
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
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image ?? null,
      });
    });

    return AuthMiddleware.of(({ headers, next }) =>
      Effect.gen(function* () {
        const currentUser = yield* getSession(headers).pipe(
          Effect.withSpan("Auth.middleware")
        );

        return yield* next.pipe(
          Effect.provideService(CurrentUser, currentUser),
          Effect.annotateLogs({
            userId: currentUser.id,
            userEmail: currentUser.email,
          })
        );
      })
    );
  })
);
