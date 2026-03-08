import { Effect } from "effect";
import { catchRest } from "../../catch";
import { HealthRpc } from "./health.rpc";

export const HealthHandler = HealthRpc.toLayer(
  HealthRpc.of({
    "health.check": Effect.fnUntraced(function* (_payload) {
      return yield* Effect.succeed({ status: "ok" });
    }, catchRest),
  })
);
