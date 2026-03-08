import { HttpApi } from "@effect/platform";
import { HealthGroup } from "./domains/health/health.group";
import { ProfileGroup } from "./domains/profile/profile.group";
import { InternalError, UnauthorizedError } from "./errors";

export const AppApi = HttpApi.make("app")
  .add(HealthGroup)
  .add(ProfileGroup)
  .addError(UnauthorizedError)
  .addError(InternalError);
