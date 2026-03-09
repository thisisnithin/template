import { Rpc, RpcGroup } from "@effect/rpc";
import { Schema } from "effect";
import { InternalError } from "../../errors";
import { AuthMiddleware } from "../auth/auth.middleware";

export const ProfileRpc = RpcGroup.make(
  Rpc.make("profile.getProfile", {
    success: Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      email: Schema.String,
      image: Schema.NullOr(Schema.String),
      emailVerified: Schema.Boolean,
      createdAt: Schema.String,
    }),
    error: InternalError,
  }).middleware(AuthMiddleware)
);
