import { expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { setupTest } from "../test/utils";

it("reports ok", async () => {
  const t = setupTest();

  const result = await t.query(api.health.health.check, {});

  expect(result).toEqual({ status: "ok" });
});
