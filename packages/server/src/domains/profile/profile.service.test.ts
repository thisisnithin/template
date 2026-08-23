import { Db } from "@app/db/client";
import { user } from "@app/db/schemas/schema";
import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { SharedPgClientLive } from "../../test/utils";
import { ProfileRepository } from "./profile.repository";
import { ProfileService } from "./profile.service";
import { ProfileId } from "./profile.types";

const TestDb = Db.layerNoDeps.pipe(Layer.provide(SharedPgClientLive));

const ServiceLive = ProfileService.layerNoDeps.pipe(
  Layer.provide(ProfileRepository.layerNoDeps),
  Layer.provideMerge(TestDb),
  Layer.fresh
);

const seedId = ProfileId.make("service-test-user");

describe("ProfileService", () => {
  it.layer(ServiceLive, { timeout: "60 seconds" })("getById", (scoped) => {
    scoped.effect("setup: seed profile", () =>
      Effect.gen(function* () {
        const db = yield* Db;
        yield* db.insert(user).values({
          createdAt: new Date(),
          email: "service-test@example.com",
          emailVerified: true,
          id: seedId,
          image: null,
          name: "Service Test",
          updatedAt: new Date(),
        });
      })
    );

    scoped.effect("returns the profile as a domain model", () =>
      Effect.gen(function* () {
        const profileService = yield* ProfileService;
        const profile = yield* profileService.getById({ id: seedId });

        expect(profile.id).toBe(seedId);
        expect(profile.email).toBe("service-test@example.com");
        expect(profile.emailVerified).toBe(true);
        // A null column decodes to Option.none(), never null.
        expect(Option.isNone(profile.image)).toBe(true);
        expect(profile.createdAt instanceof Date).toBe(true);
      })
    );

    scoped.effect("fails with ProfileNotFoundError for an unknown id", () =>
      Effect.gen(function* () {
        const profileService = yield* ProfileService;
        const result = yield* Effect.result(
          profileService.getById({ id: ProfileId.make("does-not-exist") })
        );

        expect(result._tag).toBe("Failure");
        if (result._tag === "Failure") {
          expect(result.failure._tag).toBe("@profile/ProfileNotFoundError");
        }
      })
    );
  });
});
