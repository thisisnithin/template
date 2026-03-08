import { AppApi } from "@app/server/api";
import { FetchHttpClient } from "@effect/platform";
import { AtomHttpApi } from "@effect-atom/atom";

export const ApiClient = AtomHttpApi.Tag()("ApiClient", {
  api: AppApi,
  httpClient: FetchHttpClient.layer,
  baseUrl: "/api/server",
});
