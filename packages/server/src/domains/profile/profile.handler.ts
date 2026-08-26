import { syncedResponse } from "@app/sync/server";
import { Effect, Option } from "effect";
import { catchRest } from "../../catch";
import { InternalError } from "../../errors";
import { CurrentUser } from "../auth/auth.middleware";
import { ProfileRpc } from "./profile.rpc";
import { ProfileService } from "./profile.service";
import { ProfileId } from "./profile.types";

export const ProfileHandler = ProfileRpc.toLayer(
  Effect.gen(function* () {
    const profileService = yield* ProfileService;

    return ProfileRpc.of({
      "profile.getProfile": Effect.fnUntraced(function* () {
        const currentUser = yield* CurrentUser;

        const profile = yield* profileService
          .getById({ id: ProfileId.make(currentUser.id) })
          .pipe(
            // An authenticated session without a row is an impossible state.
            Effect.catchTag(
              "@profile/ProfileNotFoundError",
              () => new InternalError({})
            )
          );

        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          image: Option.getOrNull(profile.image),
          emailVerified: profile.emailVerified,
          createdAt: profile.createdAt.toISOString(),
        };
      }, catchRest),

      "profile.updateName": Effect.fnUntraced(function* ({ name }) {
        const currentUser = yield* CurrentUser;

        yield* profileService
          .updateName({ id: ProfileId.make(currentUser.id), name })
          .pipe(
            // An authenticated session without a row is an impossible state.
            Effect.catchTag(
              "@profile/ProfileNotFoundError",
              () => new InternalError({})
            )
          );

        return yield* syncedResponse();
      }, catchRest),
    });
  })
);
