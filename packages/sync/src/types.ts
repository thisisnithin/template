import { Schema } from "effect";

export const Txid = Schema.Finite.pipe(
  Schema.brand("Txid"),
  Schema.annotate({
    identifier: "Txid",
    title: "Transaction ID",
    description:
      "Postgres transaction id a sync client waits for before dropping its optimistic write",
  })
);
export type Txid = typeof Txid.Type;
export const isTxid = Schema.is(Txid);

export const SyncedWrite = Schema.Struct({ txid: Txid });

export const syncedWrite = <F extends Schema.Struct.Fields>(fields: F) =>
  Schema.Struct({ ...SyncedWrite.fields, ...fields });
