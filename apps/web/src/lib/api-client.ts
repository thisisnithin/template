import { AppRouter } from "@app/server/router";
import { Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { AtomRpc } from "effect/unstable/reactivity";
import { RpcClient, RpcSerialization } from "effect/unstable/rpc";

const protocol = RpcClient.layerProtocolHttp({ url: "/api/server" }).pipe(
  Layer.provide(RpcSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer)
);

export class ApiClient extends AtomRpc.Service<ApiClient>()("ApiClient", {
  group: AppRouter,
  protocol,
}) {}
