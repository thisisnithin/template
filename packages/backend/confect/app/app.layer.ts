import type { FunctionSpec, GroupSpec } from "@confect/core";
import { FunctionImpl, GroupImpl, MiddlewareImpl } from "@confect/server";
import { Cause, Effect, Layer, References } from "effect";
import databaseSchema from "../_generated/schema";
import { ActionCtx, MutationCtx } from "../_generated/services";
import { PostHogClient } from "../analytics/posthog.client";
import { RequireUserImpl } from "../auth/auth.middleware.layer";
import { BetterAuthClient } from "../auth/better-auth.client";
import { ResendClient } from "../email/resend.client";
import type { LogReport } from "../logger";
import { makeLoggerLayer } from "../logger";
import { App, WithApp } from "./app";

const ClientsLayer = Layer.mergeAll(
  PostHogClient.layer,
  BetterAuthClient.layer,
  ResendClient.layer
);

const app = Effect.gen(function* () {
  const analytics = yield* PostHogClient;
  const auth = yield* BetterAuthClient;
  const mailer = yield* ResendClient;

  return App.of({ analytics, auth, mailer });
});

type ReportCtx = Parameters<PostHogClient["Service"]["captureException"]>[0];

const toProperties = (annotations: Record<string, unknown>) => {
  const { userEmail, userId, ...rest } = annotations;

  return {
    distinctId: typeof userId === "string" ? userId : undefined,
    properties: Object.fromEntries(
      Object.entries(rest).map(([key, value]) => [key, String(value)])
    ),
  };
};

const instrument =
  (ctx: ReportCtx, services: App["Service"], name: string) =>
  <A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> => {
    const logged: LogReport[] = [];

    const flush = Effect.forEach(logged, (entry) => {
      const { distinctId, properties } = toProperties(entry.annotations);

      return services.analytics.captureException(ctx, {
        distinctId,
        error:
          Cause.hasFails(entry.cause) || Cause.hasDies(entry.cause)
            ? Cause.squash(entry.cause)
            : new Error(entry.message),
        additionalProperties: {
          ...properties,
          function: name,
          message: entry.message,
        },
      });
    });

    const reportCause = (cause: Cause.Cause<unknown>) =>
      Effect.gen(function* () {
        const annotations = yield* References.CurrentLogAnnotations;
        const { distinctId, properties } = toProperties(annotations);

        yield* services.analytics.captureException(ctx, {
          distinctId,
          error: Cause.squash(cause),
          additionalProperties: { ...properties, function: name },
        });
      });

    return self.pipe(
      Effect.provide(makeLoggerLayer((entry) => logged.push(entry))),
      Effect.tapCause(reportCause),
      Effect.ensuring(flush)
    );
  };

export const WithAppImpl = MiddlewareImpl.makeByFunctionType(
  databaseSchema,
  WithApp,
  {
    query: (next) =>
      app.pipe(
        Effect.flatMap((services) =>
          Effect.provideService(next, App, services).pipe(
            Effect.provide(makeLoggerLayer(() => undefined))
          )
        ),
        Effect.provide(ClientsLayer)
      ),

    mutation: (next, options) =>
      Effect.gen(function* () {
        const ctx = yield* MutationCtx;
        const services = yield* app;

        return yield* Effect.provideService(next, App, services).pipe(
          instrument(ctx, services, options.name)
        );
      }).pipe(Effect.provide(ClientsLayer)),

    action: (next, options) =>
      Effect.gen(function* () {
        const ctx = yield* ActionCtx;
        const services = yield* app;

        return yield* Effect.provideService(next, App, services).pipe(
          instrument(ctx, services, options.name)
        );
      }).pipe(Effect.provide(ClientsLayer)),
  }
);

export const AppFunctionImpl = {
  make: <
    Group extends GroupSpec.AnyWithProps,
    const Name extends FunctionSpec.Name<GroupSpec.Functions<Group>>,
  >(
    group: Group,
    name: Name,
    handler: Parameters<
      typeof FunctionImpl.make<typeof databaseSchema, Group, Name>
    >[3]
  ): Layer.Layer<FunctionImpl.FunctionImpl<Name>> =>
    FunctionImpl.make(databaseSchema, group, name, handler),
};

export const AppGroupImpl = {
  make: <Group extends GroupSpec.AnyWithProps>(
    group: Parameters<typeof GroupImpl.make<typeof databaseSchema, Group>>[1]
  ) =>
    GroupImpl.make<typeof databaseSchema, Group>(databaseSchema, group).pipe(
      Layer.provide(Layer.mergeAll(WithAppImpl, RequireUserImpl))
    ),
  finalize: GroupImpl.finalize,
};
