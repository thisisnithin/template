import { SyncedWrite } from "@app/sync/types";
import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/unstable/rpc";
import { InternalError } from "../../errors";
import { AuthMiddleware } from "../auth/auth.middleware";

export const UpdateNamePayload = Schema.Struct({
  name: Schema.String.pipe(
    Schema.check(
      Schema.isMinLength(1, { message: "Display name can't be empty" })
    )
  ),
});

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
  }).middleware(AuthMiddleware),
  Rpc.make("profile.updateName", {
    payload: UpdateNamePayload,
    success: SyncedWrite,
    error: InternalError,
  }).middleware(AuthMiddleware)
);
