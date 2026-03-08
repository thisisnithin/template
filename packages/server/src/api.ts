import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { InternalError, NotFoundError } from "./errors";

export const HealthGroup = HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("check", "/health")
    .addSuccess(
      Schema.Struct({
        status: Schema.String,
      })
    )
    .addError(InternalError)
);

export const ProfileGroup = HttpApiGroup.make("profile").add(
  HttpApiEndpoint.get("getProfile", "/profile")
    .setUrlParams(Schema.Struct({ userId: Schema.String }))
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
    .addError(NotFoundError)
    .addError(InternalError)
);

export const AppApi = HttpApi.make("app").add(HealthGroup).add(ProfileGroup);
