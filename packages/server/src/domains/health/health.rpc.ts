import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/unstable/rpc";
import { InternalError } from "../../errors";

export const HealthRpc = RpcGroup.make(
  Rpc.make("health.check", {
    error: InternalError,
    success: Schema.Struct({
      status: Schema.String,
    }),
  })
);
