import { HttpApiBuilder } from "@effect/platform";
import { Effect } from "effect";
import { AppApi } from "../../api";
import { catchRest } from "../../catch";

export const HealthRoute = HttpApiBuilder.group(AppApi, "health", (handlers) =>
  handlers.handle(
    "check",
    Effect.fn(function* () {
      return yield* Effect.succeed({ status: "ok" });
    }, catchRest)
  )
);
