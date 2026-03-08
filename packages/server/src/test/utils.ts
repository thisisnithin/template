import { Db } from "@app/db/client";
import { HttpApiBuilder } from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node";
import { PgClient } from "@effect/sql-pg";
import { type Context, Effect, Layer, Redacted } from "effect";
import { inject } from "vitest";
import { AppApi } from "../api";
import { HealthRoute } from "../domains/health/health.route";
import { ProfileRoute } from "../domains/profile/profile.route";
import { AuthMiddleware, CurrentUser } from "../middleware/auth.middleware";

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
  Effect.succeed(CurrentUser.of(mockUser))
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

const ApiLayer = HttpApiBuilder.api(AppApi).pipe(
  Layer.provide(Layer.mergeAll(HealthRoute, ProfileRoute)),
  Layer.provide(MockAuthMiddlewareLayer),
  Layer.provide(TestDb)
);

export const HttpLive = HttpApiBuilder.serve().pipe(
  Layer.provide(ApiLayer),
  Layer.provideMerge(NodeHttpServer.layerTest),
  Layer.provideMerge(TestDb),
  Layer.fresh
);
