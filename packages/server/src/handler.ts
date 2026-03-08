import { Db, PgLayer } from "@app/db/client";
import { LoggerLayer } from "@app/shared/logger";
import { HttpApiBuilder } from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node";
import { Layer } from "effect";
import { AppApi } from "./api";
import { HealthRoute } from "./domains/health/health.route";
import { ProfileRoute } from "./domains/profile/profile.route";
import { AuthMiddlewareLayer } from "./middleware/auth.middleware.layer";

const Base = Layer.mergeAll(
  Db.Default,
  PgLayer,
  NodeHttpServer.layerContext,
  LoggerLayer
);

const Routes = Layer.mergeAll(HealthRoute, ProfileRoute);

const Middleware = Layer.mergeAll(AuthMiddlewareLayer);

const Api = HttpApiBuilder.api(AppApi).pipe(
  Layer.provide(Routes),
  Layer.provide(Middleware),
  Layer.provideMerge(Base)
);

export const { handler } = HttpApiBuilder.toWebHandler(Api);
