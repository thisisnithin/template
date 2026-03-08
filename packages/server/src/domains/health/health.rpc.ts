import { Rpc, RpcGroup } from "@effect/rpc";
import { Schema } from "effect";
import { InternalError } from "../../errors";

export const HealthRpc = RpcGroup.make(
  Rpc.make("health.check", {
    success: Schema.Struct({
      status: Schema.String,
    }),
    error: InternalError,
  })
);
