import { HttpApiSchema } from "@effect/platform";
import { Schema } from "effect";

export class ProfileNotFoundError extends Schema.TaggedError<ProfileNotFoundError>()(
  "ProfileNotFoundError",
  { userId: Schema.String },
  HttpApiSchema.annotations({ status: 404 })
) {
  get message() {
    return `Profile not found for user: ${this.userId}`;
  }
}
