import { MiddlewareSpec } from "@confect/core";
import { Context, Effect, Schema } from "effect";

export class CurrentUser extends Context.Service<
  CurrentUser,
  {
    readonly id: string;
    readonly email: string;
    readonly name: string;
    readonly image: string | null;
  }
>()("@auth/CurrentUser") {}

export class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>()(
  "@auth/UnauthorizedError",
  {
    message: Schema.String.pipe(
      Schema.withConstructorDefault(Effect.succeed("Unauthorized"))
    ),
  }
) {}

export class RequireUser extends MiddlewareSpec.MiddlewareSpec<
  RequireUser,
  { provides: CurrentUser }
>()("RequireUser", {
  error: () => UnauthorizedError,
  functionTypes: { action: true, mutation: true, query: true },
}) {}
