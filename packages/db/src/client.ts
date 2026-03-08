import { env } from "@app/shared/env";
import * as PgDrizzle from "@effect/sql-drizzle/Pg";
import { PgClient } from "@effect/sql-pg";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import { Effect, Redacted } from "effect";
import * as schema from "./schemas/schema";

export const PgLayer = PgClient.layer({
  url: Redacted.make(env.DATABASE_URL),
});

/** Plain Drizzle client for non-Effect consumers (e.g. Better Auth) */
export const makeDrizzle = (url: string) => drizzleNode(url, { schema });

/** Effect-native Drizzle service via @effect/sql-drizzle */
export class Db extends Effect.Service<Db>()("Db", {
  effect: PgDrizzle.make({ schema }),
  dependencies: [PgLayer],
}) {}
