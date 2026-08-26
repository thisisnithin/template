import {
  getTableColumns,
  getTableName,
  type SQL,
  sql,
  type Table,
} from "drizzle-orm";
import { Context, Effect, Layer, Option, Ref } from "effect";
import { RpcMiddleware } from "effect/unstable/rpc";
import { Txid } from "./types";

/**
 * Must be selected by the write's own statement: `pg_current_xact_id()` is
 * evaluated per transaction, so a second statement reports a different one.
 */
export const txidColumn = (): SQL<string> =>
  sql<string>`pg_current_xact_id()::xid::text`;

export const withTxid = <T extends Record<string, unknown>>(
  columns: T
): T & { readonly txid: SQL<string> } => ({
  ...columns,
  txid: txidColumn(),
});

const toTxid = (raw: string): Txid => Txid.make(Number(raw));

const unscopedCell = Ref.makeUnsafe(Option.none<Txid>());

export const CurrentTxid = Context.Reference<Ref.Ref<Option.Option<Txid>>>(
  "@server/CurrentTxid",
  { defaultValue: () => unscopedCell }
);

export const recordTxid = (raw: string): Effect.Effect<void> =>
  Effect.gen(function* () {
    const current = yield* CurrentTxid;

    if (current === unscopedCell) {
      return yield* Effect.die(
        new Error(
          "SyncMiddleware is not installed: a transaction id recorded here would leak between requests"
        )
      );
    }

    yield* Ref.set(current, Option.some(toTxid(raw)));
  });

export function syncedResponse(): Effect.Effect<{ readonly txid: Txid }>;
export function syncedResponse<F extends Record<string, unknown>>(
  fields: F
): Effect.Effect<F & { readonly txid: Txid }>;
export function syncedResponse(
  fields: Record<string, unknown> = {}
): Effect.Effect<Record<string, unknown> & { readonly txid: Txid }> {
  return Effect.gen(function* () {
    const current = yield* CurrentTxid;
    const txid = yield* Ref.get(current);

    if (Option.isNone(txid)) {
      return yield* Effect.die(
        new Error("a sync-backed write recorded no transaction id")
      );
    }

    return { ...fields, txid: txid.value };
  });
}

export class SyncMiddleware extends RpcMiddleware.Service<SyncMiddleware>()(
  "SyncMiddleware"
) {}

export const SyncMiddlewareLayer = Layer.succeed(
  SyncMiddleware,
  SyncMiddleware.of((next) =>
    Effect.gen(function* () {
      const current = yield* Ref.make(Option.none<Txid>());
      return yield* next.pipe(Effect.provideService(CurrentTxid, current));
    })
  )
);

export interface ShapeScope {
  readonly params: readonly string[];
  readonly where: string;
}

export interface ShapeDefinition {
  readonly columns?: readonly string[];
  /** Returning null denies the request. */
  readonly scope: (userId: string) => ShapeScope | null;
  readonly table: Table;
}

export const shapeTableName = (definition: ShapeDefinition): string =>
  getTableName(definition.table);

export const shapeColumnNames = (
  definition: ShapeDefinition
): readonly string[] =>
  definition.columns ??
  Object.values(getTableColumns(definition.table)).map((column) => column.name);
