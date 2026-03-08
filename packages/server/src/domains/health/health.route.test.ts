import { HttpApiClient } from "@effect/platform";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { AppApi } from "../../api";
import { HttpLive } from "../../test/utils";

describe("Health Route", () => {
  it.layer(HttpLive)("health endpoints", (it) => {
    it.effect("GET /health returns status ok", () =>
      Effect.gen(function* () {
        const client = yield* HttpApiClient.make(AppApi);
        const response = yield* client.health.check();

        expect(response.status).toBe("ok");
      })
    );
  });
});
