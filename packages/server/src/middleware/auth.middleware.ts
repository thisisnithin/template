import { HttpApiMiddleware } from "@effect/platform";
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

export class AuthMiddleware extends HttpApiMiddleware.Tag<AuthMiddleware>()(
  "AuthMiddleware",
  {
    failure: UnauthorizedError,
    provides: CurrentUser,
  }
) {}
