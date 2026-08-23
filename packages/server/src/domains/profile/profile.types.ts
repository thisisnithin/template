import { Schema } from "effect";

/**
 * Branded over `Schema.String`, not a UUID check: Better Auth issues these ids,
 * so the value is foreign to us and `.make()` must not reject its format.
 */
export const ProfileId = Schema.String.pipe(
  Schema.brand("ProfileId"),
  Schema.annotate({
    identifier: "ProfileId",
    title: "Profile ID",
    description: "Identifier of a user profile, issued by Better Auth",
  })
);
export type ProfileId = typeof ProfileId.Type;
export const isProfileId = Schema.is(ProfileId);

export class Profile extends Schema.Class<Profile>("@profile/Profile")({
  id: ProfileId,
  name: Schema.String,
  email: Schema.String,
  image: Schema.OptionFromNullOr(Schema.String),
  emailVerified: Schema.Boolean,
  createdAt: Schema.Date,
}) {}

export const isProfile = Schema.is(Profile);
