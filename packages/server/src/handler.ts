import { Db, PgLayer } from "@app/db/client";
import { LoggerLayer } from "@app/shared/logger";
import { HttpApiBuilder } from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node";
import { Layer } from "effect";
import { AppApi } from "./api";
import { AuthMiddlewareLayer } from "./middleware/auth.middleware.layer";

import { HealthRoute } from "./domains/health/health.route";
import { ProfileRoute } from "./domains/profile/profile.route";

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

const { handler } = HttpApiBuilder.toWebHandler(Api);

export { handler };
