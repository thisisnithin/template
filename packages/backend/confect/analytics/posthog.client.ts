import { PostHog } from "@posthog/convex";
import { Context, Effect, Layer } from "effect";
import { components } from "../_generated/components";

type CaptureCtx = Parameters<PostHog["capture"]>[0];
type CaptureArgs = Parameters<PostHog["capture"]>[1];
type ExceptionArgs = Parameters<PostHog["captureException"]>[1];
type IdentifyArgs = Parameters<PostHog["identify"]>[1];

export const posthogComponent = new PostHog(components.posthog);

export class PostHogClient extends Context.Service<PostHogClient>()(
  "@analytics/PostHogClient",
  {
    make: Effect.sync(() => {
      const client = posthogComponent;

      const capture: (
        ctx: CaptureCtx,
        args: CaptureArgs
      ) => Effect.Effect<void> = Effect.fn("PostHogClient.capture")(
        function* (ctx, args) {
          yield* Effect.promise(() => client.capture(ctx, args));
        }
      );

      const identify: (
        ctx: CaptureCtx,
        args: IdentifyArgs
      ) => Effect.Effect<void> = Effect.fn("PostHogClient.identify")(
        function* (ctx, args) {
          yield* Effect.promise(() => client.identify(ctx, args));
        }
      );

      const captureException: (
        ctx: CaptureCtx,
        args: ExceptionArgs
      ) => Effect.Effect<void> = Effect.fn("PostHogClient.captureException")(
        function* (ctx, args) {
          yield* Effect.promise(() => client.captureException(ctx, args));
        }
      );

      const use = Effect.fn("PostHogClient.use")(
        <A>(f: (client: PostHog) => Promise<A>): Effect.Effect<A> =>
          Effect.promise(() => f(client))
      );

      return { client, capture, captureException, identify, use } as const;
    }),
  }
) {
  static readonly layer = Layer.effect(PostHogClient, PostHogClient.make);
}
