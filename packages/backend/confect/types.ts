import { Schema } from "effect";

export const UserId = Schema.String.pipe(
  Schema.brand("UserId"),
  Schema.annotate({
    identifier: "UserId",
    title: "User ID",
    description: "Identifier of a user, issued by Better Auth",
  })
);
export type UserId = typeof UserId.Type;
export const isUserId = Schema.is(UserId);
