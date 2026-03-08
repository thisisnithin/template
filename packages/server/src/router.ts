import { HealthRpc } from "./domains/health/health.rpc";
import { ProfileRpc } from "./domains/profile/profile.rpc";

export const AppRouter = HealthRpc.merge(ProfileRpc);
