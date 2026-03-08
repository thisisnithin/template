import { RpcClient } from "@effect/rpc";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { AppRouter } from "../../router";
import { RpcLive } from "../../test/utils";

describe("Health Route", () => {
  it.layer(RpcLive)("health endpoints", (it) => {
    it.effect("health.check returns status ok", () =>
      Effect.scoped(
        Effect.gen(function* () {
          const client = yield* RpcClient.make(AppRouter);
          const response = yield* client.health.check();

          expect(response.status).toBe("ok");
        })
      )
    );
  });
});
