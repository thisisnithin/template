import { Db } from "@app/db/client";
import { user } from "@app/db/schemas/schema";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { RpcClient } from "effect/unstable/rpc";
import { AppRouter } from "../../router";
import { mockUser, RpcLive } from "../../test/utils";

describe("Profile Route", () => {
  it.layer(RpcLive, { timeout: "60 seconds" })(
    "profile endpoints",
    (scoped) => {
      scoped.effect("setup: seed test user", () =>
        Effect.gen(function* () {
          const db = yield* Db;
          yield* db.insert(user).values({
            createdAt: new Date(),
            email: mockUser.email,
            emailVerified: false,
            id: mockUser.id,
            name: mockUser.name,
            updatedAt: new Date(),
          });
        })
      );

      scoped.effect("profile.getProfile returns current user profile", () =>
        Effect.scoped(
          Effect.gen(function* () {
            const client = yield* RpcClient.make(AppRouter);
            const response = yield* client["profile.getProfile"]();

            expect(response.id).toBe(mockUser.id);
            expect(response.email).toBe(mockUser.email);
            expect(response.name).toBe(mockUser.name);
          })
        )
      );

      scoped.effect("profile.updateName renames the profile", () =>
        Effect.scoped(
          Effect.gen(function* () {
            const client = yield* RpcClient.make(AppRouter);
            yield* client["profile.updateName"]({ name: "Renamed User" });

            const profile = yield* client["profile.getProfile"]();
            expect(profile.name).toBe("Renamed User");
          })
        )
      );
    }
  );
});
