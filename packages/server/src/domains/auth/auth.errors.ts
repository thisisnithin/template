import { Schema } from "effect";

export class BetterAuthError extends Schema.TaggedError<BetterAuthError>()(
  "@auth/BetterAuthError",
  { cause: Schema.Defect }
) {}
