import { Db, PgLayer } from "@app/db/client";
import { LoggerLayer } from "@app/shared/logger";
import { HttpApiBuilder } from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node";
import { Layer } from "effect";
import { AppApi } from "./api";
import { HealthRoute } from "./routes/health.route";
import { ProfileRoute } from "./routes/profile.route";

const Base = Layer.mergeAll(
  Db.Default,
  PgLayer,
  NodeHttpServer.layerContext,
  LoggerLayer
);

const Routes = Layer.mergeAll(HealthRoute, ProfileRoute);

const Api = Layer.provideMerge(
  Layer.provide(HttpApiBuilder.api(AppApi), Routes),
  Base
);

const { handler, dispose } = HttpApiBuilder.toWebHandler(Api);

export { dispose, handler };
