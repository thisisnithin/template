import { Schema } from "effect";

/** Email regex from zod v4 (practical email validation) */
const emailPattern =
  /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;

export const Email = Schema.String.pipe(
  Schema.nonEmptyString({ message: () => "Email is required" }),
  Schema.pattern(emailPattern, {
    message: () => "Enter a valid email address",
  })
);
