import { Db } from "@app/db/client";
import { LoggerLayer } from "@app/shared/logger";
import { NodeHttpServer } from "@effect/platform-node";
import { Layer } from "effect";
import { HttpRouter } from "effect/unstable/http";
import { RpcSerialization, RpcServer } from "effect/unstable/rpc";
import { AuthMiddlewareLayer } from "./domains/auth/auth.middleware.layer";
import { BetterAuthClient } from "./domains/auth/better-auth.client";
import { HealthHandler } from "./domains/health/health.handler";
import { ProfileHandler } from "./domains/profile/profile.handler";
import { ProfileRepository } from "./domains/profile/profile.repository";
import { ProfileService } from "./domains/profile/profile.service";
import { AppRouter } from "./router";
import { TracingLayer } from "./tracing";

const Base = Layer.mergeAll(
  Db.layer,
  NodeHttpServer.layerHttpServices,
  LoggerLayer,
  TracingLayer,
  BetterAuthClient.layer
);

// Domain services depend on Db, which Base provides.
const Domain = ProfileService.layerNoDeps.pipe(
  Layer.provide(ProfileRepository.layerNoDeps)
);

const Handlers = Layer.mergeAll(HealthHandler, ProfileHandler);

const Middleware = Layer.mergeAll(AuthMiddlewareLayer);

const RpcLayer = Layer.mergeAll(
  Handlers,
  Middleware,
  RpcSerialization.layerJson
);

export const { handler } = HttpRouter.toWebHandler(
  RpcServer.layerHttp({
    group: AppRouter,
    path: "/api/server",
    // layerHttp mounts a websocket route unless this is set explicitly
    protocol: "http",
  }).pipe(
    Layer.provide(
      RpcLayer.pipe(Layer.provide(Domain), Layer.provideMerge(Base))
    )
  )
);
