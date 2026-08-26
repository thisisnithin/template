import { AppRouter } from "@app/server/router";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { RpcClient, RpcSerialization } from "effect/unstable/rpc";

const protocol = RpcClient.layerProtocolHttp({ url: "/api/server" }).pipe(
  Layer.provide(RpcSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer)
);

const makeClient = RpcClient.make(AppRouter);

type Client =
  typeof makeClient extends Effect.Effect<infer A, infer _E, infer _R>
    ? A
    : never;

export const rpc = <A, E>(
  use: (client: Client) => Effect.Effect<A, E>
): Effect.Effect<A, E> =>
  Effect.gen(function* () {
    const client = yield* makeClient;
    return yield* use(client);
  }).pipe(Effect.scoped, Effect.provide(protocol));
