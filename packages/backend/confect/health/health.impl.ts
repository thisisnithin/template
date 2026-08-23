import { Effect, Layer } from "effect";
import { AppFunctionImpl, AppGroupImpl } from "../app/app.layer";
import health from "./health.spec";

const check = AppFunctionImpl.make(health, "check", () =>
  Effect.succeed({ status: "ok" })
);

export default AppGroupImpl.make(health).pipe(
  Layer.provide(check),
  AppGroupImpl.finalize
);
