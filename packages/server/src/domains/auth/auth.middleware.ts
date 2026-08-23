import { Context } from "effect";
import { RpcMiddleware } from "effect/unstable/rpc";
import { UnauthorizedError } from "../../errors";

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
>()("AuthMiddleware", { error: UnauthorizedError }) {}
