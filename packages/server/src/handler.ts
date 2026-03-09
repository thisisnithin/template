import { Db, PgLayer } from "@app/db/client";
import { LoggerLayer } from "@app/shared/logger";
import { NodeHttpServer } from "@effect/platform-node";
import { RpcSerialization, RpcServer } from "@effect/rpc";
import { Layer } from "effect";
import { AuthMiddlewareLayer } from "./domains/auth/auth.middleware.layer";
import { BetterAuthClient } from "./domains/auth/better-auth.client";
import { HealthHandler } from "./domains/health/health.handler";
import { ProfileHandler } from "./domains/profile/profile.handler";
import { AppRouter } from "./router";
import { TracingLayer } from "./tracing";

const Base = Layer.mergeAll(
  Db.Default,
  PgLayer,
  NodeHttpServer.layerContext,
  LoggerLayer,
  TracingLayer,
  BetterAuthClient.Default
);

const Handlers = Layer.mergeAll(HealthHandler, ProfileHandler);

const Middleware = Layer.mergeAll(AuthMiddlewareLayer);

const RpcLayer = Layer.mergeAll(
  Handlers,
  Middleware,
  RpcSerialization.layerJson
);

export const { handler } = RpcServer.toWebHandler(AppRouter, {
  layer: RpcLayer.pipe(Layer.provideMerge(Base)),
});
