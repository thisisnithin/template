import { SyncMiddleware } from "@app/sync/server";
import { HealthRpc } from "./domains/health/health.rpc";
import { ProfileRpc } from "./domains/profile/profile.rpc";

// SyncMiddleware is applied to the whole router: it gives each request the cell
// a write records its transaction id into, so no rpc has to opt in.
export const AppRouter = HealthRpc.merge(ProfileRpc).middleware(SyncMiddleware);
