import { auth } from "@app/auth";
import { Headers } from "@effect/platform";
import { Effect, Layer, Option } from "effect";
import { UnauthorizedError } from "../errors";
import { AuthMiddleware, CurrentUser } from "./auth.middleware";

const getSession = Effect.fnUntraced(function* (headers: Headers.Headers) {
  const cookieHeader = Headers.get(headers, "cookie");

  if (Option.isNone(cookieHeader)) {
    return yield* new UnauthorizedError({ message: "No session cookie" });
  }

  const headerRecord = new globalThis.Headers();
  headerRecord.set("cookie", cookieHeader.value);

  const session = yield* Effect.tryPromise({
    try: () =>
      auth.api.getSession({
        headers: headerRecord,
      }),
    catch: () =>
      new UnauthorizedError({ message: "Session validation failed" }),
  });

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

export const AuthMiddlewareLayer = Layer.effect(
  AuthMiddleware,
  Effect.gen(function* () {
    return AuthMiddleware.of(({ headers, next }) =>
      Effect.gen(function* () {
        const currentUser = yield* getSession(headers).pipe(
          Effect.withSpan("middleware.auth")
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
