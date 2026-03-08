import { AppRouter } from "@app/server/router";
import { FetchHttpClient } from "@effect/platform";
import { RpcClient, RpcSerialization } from "@effect/rpc";
import { AtomRpc } from "@effect-atom/atom";
import { Layer } from "effect";

const protocol = RpcClient.layerProtocolHttp({ url: "/api/server" }).pipe(
  Layer.provide(RpcSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer)
);

export class ApiClient extends AtomRpc.Tag<ApiClient>()("ApiClient", {
  group: AppRouter,
  protocol,
}) {}
