import { Schema } from "effect";

export class ProfileNotFoundError extends Schema.TaggedError<ProfileNotFoundError>()(
  "ProfileNotFoundError",
  { userId: Schema.String }
) {
  get message() {
    return `Profile not found for user: ${this.userId}`;
  }
}
