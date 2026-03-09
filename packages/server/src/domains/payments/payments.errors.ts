import { Schema } from "effect";

export class DodoPaymentsError extends Schema.TaggedError<DodoPaymentsError>()(
  "@payments/DodoPaymentsError",
  { cause: Schema.Defect }
) {}
