import { env } from "@app/shared/env";
import { PgClient } from "@effect/sql-pg";
import * as PgDrizzle from "drizzle-orm/effect-postgres";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import { Context, Layer, Redacted } from "effect";
import { relations } from "./schemas/relations";

export const PgLayer = PgClient.layer({
  url: Redacted.make(env.DATABASE_URL),
});

/** Plain Drizzle client for non-Effect consumers (e.g. Better Auth) */
export const makeDrizzle = (url: string) => drizzleNode(url, { relations });

export class Db extends Context.Service<Db>()("@app/db/Db", {
  make: PgDrizzle.makeWithDefaults(),
}) {
  static readonly layerNoDeps = Layer.effect(Db, Db.make);

  static readonly layer = Db.layerNoDeps.pipe(Layer.provide(PgLayer));
}
