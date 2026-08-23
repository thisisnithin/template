import { Schema } from "effect";

const emailPattern =
  /^(?!\.)(?!.*\.\.)(?:[A-Za-z0-9_'+\-.]*)[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/u;

export const Email = Schema.String.pipe(
  Schema.check(
    Schema.isNonEmpty({ message: "Email is required" }),
    Schema.isPattern(emailPattern, {
      message: "Enter a valid email address",
    })
  )
);
