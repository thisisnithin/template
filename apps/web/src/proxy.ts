import { getSessionCookie } from "better-auth/cookies";
import { Effect } from "effect";
import { FetchHttpClient, HttpClient } from "effect/unstable/http";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type Step = (
  request: NextRequest
) => Effect.Effect<void, NextResponse, HttpClient.HttpClient>;

const toLogin = (request: NextRequest) =>
  NextResponse.redirect(new URL("/", request.url));

const toUnavailable = (request: NextRequest) =>
  NextResponse.rewrite(new URL("/unavailable", request.url), {
    headers: { "Retry-After": "300" },
    status: 503,
  });

const requireSessionCookie: Step = (request) =>
  getSessionCookie(request) ? Effect.void : Effect.fail(toLogin(request));

const requireValidSession: Step = (request) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;

    const response = yield* client
      .get(new URL("/api/auth/get-session", request.url), {
        headers: { cookie: request.headers.get("cookie") ?? "" },
      })
      .pipe(Effect.mapError(() => toUnavailable(request)));

    if (response.status >= 400) {
      return yield* Effect.fail(toUnavailable(request));
    }

    const session = yield* response.json.pipe(
      Effect.mapError(() => toUnavailable(request))
    );

    if (!session) {
      return yield* Effect.fail(toLogin(request));
    }
  });

const chain = (request: NextRequest, steps: readonly Step[]) =>
  Effect.forEach(steps, (step) => step(request), { discard: true }).pipe(
    Effect.match({
      onFailure: (response) => response,
      onSuccess: () => NextResponse.next(),
    }),
    Effect.provide(FetchHttpClient.layer)
  );

export const proxy = (request: NextRequest) =>
  Effect.runPromise(
    chain(request, [requireSessionCookie, requireValidSession])
  );

export const config = {
  matcher: ["/app/:path*"],
};
