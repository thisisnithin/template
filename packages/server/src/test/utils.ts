import { Db } from "@app/db/client";
import { NodeHttpServer } from "@effect/platform-node";
import { PgClient } from "@effect/sql-pg";
import { Effect, Layer, Redacted } from "effect";
import { HttpServer } from "effect/unstable/http";
import { RpcClient, RpcSerialization, RpcServer } from "effect/unstable/rpc";
import { inject } from "vitest";
import { AuthMiddleware, CurrentUser } from "../domains/auth/auth.middleware";
import { HealthHandler } from "../domains/health/health.handler";
import { ProfileHandler } from "../domains/profile/profile.handler";
import { ProfileRepository } from "../domains/profile/profile.repository";
import { ProfileService } from "../domains/profile/profile.service";
import { AppRouter } from "../router";

// ---------------------------------------------------------------------------
// Mock Auth
// ---------------------------------------------------------------------------

export const mockUser: CurrentUser["Service"] = {
  id: "test-user-id",
  email: "test@example.com",
  name: "Test User",
  image: null,
};

export const MockAuthMiddlewareLayer = Layer.succeed(
  AuthMiddleware,
  AuthMiddleware.of((next) =>
    next.pipe(Effect.provideService(CurrentUser, CurrentUser.of(mockUser)))
  )
);

// ---------------------------------------------------------------------------
// Shared Postgres (testcontainer)
// ---------------------------------------------------------------------------

export const SharedPgClientLive = PgClient.layer({
  url: Redacted.make(inject("dbUrl")),
});

// ---------------------------------------------------------------------------
// Test Db (bypasses @app/db/client which imports env)
// ---------------------------------------------------------------------------

const TestDb = Db.layerNoDeps.pipe(Layer.provide(SharedPgClientLive));

// ---------------------------------------------------------------------------
// Composite Test Layers
// ---------------------------------------------------------------------------

const Domain = ProfileService.layerNoDeps.pipe(
  Layer.provide(ProfileRepository.layerNoDeps)
);

const Handlers = Layer.mergeAll(HealthHandler, ProfileHandler);

const RpcLayer = Layer.mergeAll(
  Handlers,
  MockAuthMiddlewareLayer,
  RpcSerialization.layerJson
).pipe(Layer.provide(Domain), Layer.provide(TestDb));

// Serve RPC over a test HTTP server (provides HttpClient, HttpServer, etc.)
const TestServer = Layer.effectDiscard(
  Effect.gen(function* () {
    const httpApp = yield* RpcServer.toHttpEffect(AppRouter);
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
