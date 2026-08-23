import { Effect, Layer, Option } from "effect";
import { QueryCtx } from "../_generated/services";
import { App } from "../app/app";
import { AppFunctionImpl, AppGroupImpl } from "../app/app.layer";
import { CurrentUser } from "../auth/auth.middleware";
import { UserId } from "../types";
import { ProfileNotFoundError } from "./profile.errors";
import profile from "./profile.spec";
import { Profile } from "./profile.types";

const getProfile = AppFunctionImpl.make(profile, "getProfile", () =>
  Effect.gen(function* () {
    const currentUser = yield* CurrentUser;
    const ctx = yield* QueryCtx;
    const { auth } = yield* App;

    const user = yield* auth.getAuthUser(ctx);

    if (user === null) {
      return yield* new ProfileNotFoundError({ userId: currentUser.id });
    }

    return new Profile({
      id: UserId.make(user._id),
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: Option.fromNullishOr(user.image),
      createdAt: user.createdAt,
    });
  })
);

export default AppGroupImpl.make(profile).pipe(
  Layer.provide(getProfile),
  AppGroupImpl.finalize
);
