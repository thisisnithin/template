import { RpcMiddleware } from "@effect/rpc";
import { Context } from "effect";
import { UnauthorizedError } from "../errors";

export class CurrentUser extends Context.Tag("CurrentUser")<
  CurrentUser,
  {
    readonly id: string;
    readonly email: string;
    readonly name: string;
    readonly image: string | null;
  }
>() {}

export class AuthMiddleware extends RpcMiddleware.Tag<AuthMiddleware>()(
  "AuthMiddleware",
  {
    wrap: true,
    provides: CurrentUser,
    failure: UnauthorizedError,
  }
) {}
