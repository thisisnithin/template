import { Context, Effect, Layer, Option } from "effect";
import { ProfileNotFoundError } from "./profile.errors";
import { ProfileRepository } from "./profile.repository";
import type { Profile, ProfileId } from "./profile.types";

export class ProfileService extends Context.Service<
  ProfileService,
  {
    readonly getById: (p: {
      readonly id: ProfileId;
    }) => Effect.Effect<Profile, ProfileNotFoundError>;
    readonly updateName: (p: {
      readonly id: ProfileId;
      readonly name: string;
    }) => Effect.Effect<Profile, ProfileNotFoundError>;
  }
>()("@profile/ProfileService") {
  static readonly layerNoDeps = Layer.effect(
    ProfileService,
    Effect.gen(function* () {
      const profileRepo = yield* ProfileRepository;

      const getById: (p: {
        readonly id: ProfileId;
      }) => Effect.Effect<Profile, ProfileNotFoundError> = Effect.fn(
        "ProfileService.getById"
      )(function* ({ id }) {
        // The repository surfaces the driver error; the service subtracts it.
        const profile = yield* profileRepo.findById(id).pipe(Effect.orDie);

        if (Option.isNone(profile)) {
          return yield* new ProfileNotFoundError({ userId: id });
        }

        return profile.value;
      });

      const updateName: (p: {
        readonly id: ProfileId;
        readonly name: string;
      }) => Effect.Effect<Profile, ProfileNotFoundError> = Effect.fn(
        "ProfileService.updateName"
      )(function* ({ id, name }) {
        const updated = yield* profileRepo
          .updateName({ id, name })
          .pipe(Effect.orDie);

        if (Option.isNone(updated)) {
          return yield* new ProfileNotFoundError({ userId: id });
        }

        return updated.value;
      });

      return ProfileService.of({ getById, updateName });
    })
  );

  static readonly layer = ProfileService.layerNoDeps.pipe(
    Layer.provide(ProfileRepository.layer)
  );
}
