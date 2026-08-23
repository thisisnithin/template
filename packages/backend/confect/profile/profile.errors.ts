import { Schema } from "effect";

export class ProfileNotFoundError extends Schema.TaggedError<ProfileNotFoundError>()(
  "@profile/ProfileNotFoundError",
  { userId: Schema.String }
) {
  override get message(): string {
    return `Profile not found for user: ${this.userId}`;
  }
}
