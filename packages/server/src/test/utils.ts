import { Db } from "@app/db/client";
import { HttpServer } from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node";
import { RpcClient, RpcSerialization, RpcServer } from "@effect/rpc";
import { PgClient } from "@effect/sql-pg";
import { type Context, Effect, Layer, Redacted } from "effect";
import { inject } from "vitest";
import { HealthHandler } from "../domains/health/health.handler";
import { ProfileHandler } from "../domains/profile/profile.handler";
import { AuthMiddleware, CurrentUser } from "../middleware/auth.middleware";
import { AppRouter } from "../router";

// ---------------------------------------------------------------------------
// Mock Auth
// ---------------------------------------------------------------------------

export const mockUser: Context.Tag.Service<CurrentUser> = {
  id: "test-user-id",
  email: "test@example.com",
  name: "Test User",
  image: null,
};

export const MockAuthMiddlewareLayer = Layer.succeed(
  AuthMiddleware,
  AuthMiddleware.of(({ next }) =>
    next.pipe(Effect.provideService(CurrentUser, CurrentUser.of(mockUser)))
  )
);

// ---------------------------------------------------------------------------
// Shared Postgres (testcontainer)
// ---------------------------------------------------------------------------

const BasePgClientLive = PgClient.layer({
  url: Redacted.make(inject("dbUrl")),
});

let migrationsRan = false;

const ensureMigrations = Effect.gen(function* () {
  if (migrationsRan) {
    return;
  }

  yield* Effect.tryPromise({
    try: async () => {
      const { migrate } = await import("drizzle-orm/node-postgres/migrator");
      const { drizzle } = await import("drizzle-orm/node-postgres");
      const db = drizzle(inject("dbUrl"));
      await migrate(db, {
        migrationsFolder: `${process.cwd()}/packages/db/src/migrations`,
      });
    },
    catch: (error) => {
      const msg = String(error);
      if (msg.includes("already exists") || msg.includes("duplicate key")) {
        return;
      }
      throw error;
    },
  });

  migrationsRan = true;
});

const MigrationsLayer = Layer.effectDiscard(ensureMigrations);

export const SharedPgClientLive = MigrationsLayer.pipe(
  Layer.provideMerge(BasePgClientLive)
);

// ---------------------------------------------------------------------------
// Test Db (bypasses @app/db/client which imports env)
// ---------------------------------------------------------------------------

const TestDb = Db.DefaultWithoutDependencies.pipe(
  Layer.provide(SharedPgClientLive)
);

// ---------------------------------------------------------------------------
// Composite Test Layers
// ---------------------------------------------------------------------------

const Handlers = Layer.mergeAll(HealthHandler, ProfileHandler);

const RpcLayer = Layer.mergeAll(
  Handlers,
  MockAuthMiddlewareLayer,
  RpcSerialization.layerJson
).pipe(Layer.provide(TestDb));

// Serve RPC over a test HTTP server (provides HttpClient, HttpServer, etc.)
const TestServer = Layer.scopedDiscard(
  Effect.gen(function* () {
    const httpApp = yield* RpcServer.toHttpApp(AppRouter);
    yield* HttpServer.serveEffect()(httpApp);
  })
).pipe(Layer.provide(RpcLayer), Layer.provideMerge(NodeHttpServer.layerTest));

// RPC client protocol — uses HttpClient from TestServer
const TestRpcProtocol = RpcClient.layerProtocolHttp({ url: "" }).pipe(
  Layer.provide(RpcSerialization.layerJson)
);

export const RpcLive = TestRpcProtocol.pipe(
  Layer.provideMerge(TestServer),
  Layer.provideMerge(RpcSerialization.layerJson),
  Layer.provideMerge(TestDb),
  Layer.fresh
);
