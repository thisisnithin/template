import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { ProfileNotFoundError } from "./domains/profile/profile.errors";
import { InternalError, UnauthorizedError } from "./errors";
import { AuthMiddleware } from "./middleware/auth.middleware";

export const HealthGroup = HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("check", "/health").addSuccess(
    Schema.Struct({
      status: Schema.String,
    })
  )
);

export const ProfileGroup = HttpApiGroup.make("profile").add(
  HttpApiEndpoint.get("getProfile", "/profile")
    .addSuccess(
      Schema.Struct({
        id: Schema.String,
        name: Schema.String,
        email: Schema.String,
        image: Schema.NullOr(Schema.String),
        emailVerified: Schema.Boolean,
        createdAt: Schema.String,
      })
    )
    .addError(ProfileNotFoundError)
    .middleware(AuthMiddleware)
);

export const AppApi = HttpApi.make("app")
  .add(HealthGroup)
  .add(ProfileGroup)
  .addError(UnauthorizedError)
  .addError(InternalError);
