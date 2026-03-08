import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { AuthMiddleware } from "../../middleware/auth.middleware";

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
    .middleware(AuthMiddleware)
);
