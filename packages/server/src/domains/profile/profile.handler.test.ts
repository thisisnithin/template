import { Db } from "@app/db/client";
import { user } from "@app/db/schemas/schema";
import { RpcClient } from "@effect/rpc";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { AppRouter } from "../../router";
import { mockUser, RpcLive } from "../../test/utils";

describe("Profile Route", () => {
  it.layer(RpcLive, { timeout: "60 seconds" })("profile endpoints", (it) => {
    it.effect("setup: seed test user", () =>
      Effect.gen(function* () {
        const db = yield* Db;
        yield* db.insert(user).values({
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      })
    );

    it.effect("profile.getProfile returns current user profile", () =>
      Effect.scoped(
        Effect.gen(function* () {
          const client = yield* RpcClient.make(AppRouter);
          const response = yield* client.profile.getProfile();

          expect(response.id).toBe(mockUser.id);
          expect(response.email).toBe(mockUser.email);
          expect(response.name).toBe(mockUser.name);
        })
      )
    );
  });
});
