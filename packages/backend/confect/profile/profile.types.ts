import { Schema } from "effect";
import { UserId } from "../types";

export class Profile extends Schema.Class<Profile>("@profile/Profile")({
  id: UserId,
  name: Schema.String,
  email: Schema.String,
  emailVerified: Schema.Boolean,
  image: Schema.OptionFromNullOr(Schema.String),
  createdAt: Schema.Finite,
}) {}

export const isProfile = Schema.is(Profile);
