import { auth } from "@app/auth";
import { HttpServerRequest } from "@effect/platform";
import { Effect, Layer } from "effect";
import { UnauthorizedError } from "../errors";
import { AuthMiddleware, CurrentUser } from "./auth.middleware";

export const AuthMiddlewareLayer = Layer.succeed(
  AuthMiddleware,
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;

    const session = yield* Effect.tryPromise({
      try: () =>
        auth.api.getSession({
          headers: request.headers,
        }),
      catch: () =>
        new UnauthorizedError({ message: "Session validation failed" }),
    });

    if (!session) {
      return yield* new UnauthorizedError({
        message: "Invalid or expired session",
      });
    }

    yield* Effect.annotateLogsScoped({
      userId: session.user.id,
      userEmail: session.user.email,
    });

    return CurrentUser.of({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image ?? null,
    });
  }).pipe(Effect.withSpan("middleware.auth"))
);
