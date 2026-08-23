import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { RpcClient } from "effect/unstable/rpc";
import { AppRouter } from "../../router";
import { RpcLive } from "../../test/utils";

describe("Health Route", () => {
  it.layer(RpcLive)("health endpoints", (scoped) => {
    scoped.effect("health.check returns status ok", () =>
      Effect.scoped(
        Effect.gen(function* () {
          const client = yield* RpcClient.make(AppRouter);
          const response = yield* client["health.check"]();

          expect(response.status).toBe("ok");
        })
      )
    );
  });
});
