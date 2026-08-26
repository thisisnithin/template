import { createSelectSchema } from "drizzle-orm/effect-schema";
import { Schema } from "effect";
import { user } from "./auth.schema";

export const UserRow = createSelectSchema(user);
export type UserRow = typeof UserRow.Type;

/** Electric's parser converts booleans and integers, but not timestamps. */
export const UserSyncRow = Schema.Struct({
  ...UserRow.fields,
  createdAt: Schema.String,
  updatedAt: Schema.String,
});
export type UserSyncRow = typeof UserSyncRow.Type;
