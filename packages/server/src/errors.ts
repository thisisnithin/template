import { HttpApiSchema } from "@effect/platform";
import { Predicate, Schema } from "effect";

export const ApiError = Symbol.for("@app/server/ApiError");

export const isApiError = (error: unknown): boolean =>
  Predicate.hasProperty(error, ApiError) && error[ApiError] === true;

export const isNotApiError = <E>(
  error: E
): error is Exclude<E, { readonly [ApiError]: true }> => !isApiError(error);

export class NotFoundError extends Schema.TaggedError<NotFoundError>()(
  "NotFoundError",
  {
    message: Schema.String,
  },
  HttpApiSchema.annotations({ status: 404 })
) {
  readonly [ApiError] = true as const;
}

export class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>()(
  "UnauthorizedError",
  {
    message: Schema.propertySignature(Schema.String).pipe(
      Schema.withConstructorDefault(() => "Unauthorized")
    ),
  },
  HttpApiSchema.annotations({ status: 401 })
) {
  readonly [ApiError] = true as const;
}

export class InternalError extends Schema.TaggedError<InternalError>()(
  "InternalError",
  {
    message: Schema.propertySignature(Schema.String).pipe(
      Schema.withConstructorDefault(() => "An unexpected error occurred")
    ),
  },
  HttpApiSchema.annotations({ status: 500 })
) {
  readonly [ApiError] = true as const;
}
