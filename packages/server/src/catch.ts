import { Cause, Effect } from "effect";
import { InternalError, isNotApiError } from "./errors";

export const catchRest = <A, E, R>(self: Effect.Effect<A, E, R>) =>
  self.pipe(
    Effect.catchIf(isNotApiError, (error) =>
      Effect.logError("Unexpected error", Cause.fail(error)).pipe(
        Effect.andThen(Effect.fail(new InternalError({})))
      )
    ),
    Effect.catchAllDefect((defect) =>
      Effect.logFatal("Unexpected defect", Cause.fail(defect)).pipe(
        Effect.andThen(Effect.fail(new InternalError({})))
      )
    )
  );
