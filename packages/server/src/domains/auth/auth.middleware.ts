import { Context, Schema } from "effect";
import { RpcMiddleware } from "effect/unstable/rpc";
import { InternalError, UnauthorizedError } from "../../errors";

export class CurrentUser extends Context.Service<
  CurrentUser,
  {
    readonly id: string;
    readonly email: string;
    readonly name: string;
    readonly image: string | null;
  }
>()("@auth/CurrentUser") {}

export class AuthMiddleware extends RpcMiddleware.Service<
  AuthMiddleware,
  { provides: CurrentUser }
>()("AuthMiddleware", {
  error: Schema.Union([UnauthorizedError, InternalError]),
}) {}
