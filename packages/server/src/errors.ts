import { Predicate, Schema } from "effect";

export const RpcError = Symbol.for("@app/server/RpcError");

export const isRpcError = (error: unknown): boolean =>
  Predicate.hasProperty(error, RpcError) && error[RpcError] === true;

export const isNotRpcError = <E>(
  error: E
): error is Exclude<E, { readonly [RpcError]: true }> => !isRpcError(error);

export class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>()(
  "@server/UnauthorizedError",
  {
    message: Schema.propertySignature(Schema.String).pipe(
      Schema.withConstructorDefault(() => "Unauthorized")
    ),
  }
) {
  readonly [RpcError] = true as const;
}

export class InternalError extends Schema.TaggedError<InternalError>()(
  "@server/InternalError",
  {
    message: Schema.propertySignature(Schema.String).pipe(
      Schema.withConstructorDefault(() => "An unexpected error occurred")
    ),
  }
) {
  readonly [RpcError] = true as const;
}
