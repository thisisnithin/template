"use client";

import {
  type Row as ElectricRow,
  snakeCamelMapper,
} from "@electric-sql/client";
import type {
  CollectionStatus,
  Context,
  InferResultType,
  InitialQueryBuilder,
  QueryBuilder,
  UtilsRecord,
} from "@tanstack/db";
import { createCollection } from "@tanstack/db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { useLiveQuery } from "@tanstack/react-db";
import { Cause, Effect, Exit, Option, Schema } from "effect";
import { AsyncResult } from "effect/unstable/reactivity";
import { useCallback, useMemo, useState } from "react";

export class SyncFailedError extends Schema.TaggedError<SyncFailedError>()(
  "@web/SyncFailedError",
  {
    collection: Schema.String,
    detail: Schema.String,
  }
) {
  get message() {
    return `Could not sync ${this.collection}: ${this.detail}`;
  }
}

export const isSyncFailedError = Schema.is(SyncFailedError);

export interface TxidResult {
  readonly txid: number;
}

export interface CollectionWrite<E> {
  readonly run: (input: unknown) => Effect.Effect<TxidResult, E>;
}

export const collectionWrite = <
  S extends Schema.Constraint & { readonly DecodingServices: never },
  E,
>(
  payload: S,
  send: (value: S["Type"]) => Effect.Effect<TxidResult, E>
): CollectionWrite<E> => ({
  run: (input) =>
    Schema.decodeUnknownEffect(payload)(input).pipe(
      Effect.orDie,
      Effect.flatMap(send)
    ),
});

export const defineElectricCollection = <
  TRow extends ElectricRow<unknown>,
  EI = never,
  EU = never,
  ED = never,
>(options: {
  readonly shape: string;
  /**
   * Origin serving the sync route. Electric builds the shape URL with
   * `new URL(...)` and no base, so a relative path throws before the stream
   * connects.
   */
  readonly baseUrl: string;
  readonly getKey: (row: TRow) => string;
  readonly onInsert?: CollectionWrite<EI>;
  readonly onUpdate?: CollectionWrite<EU>;
  readonly onDelete?: CollectionWrite<ED>;
}) => {
  const syncError = syncErrorCapture();

  const collection = createCollection(
    electricCollectionOptions({
      getKey: options.getKey,
      id: options.shape,
      onDelete:
        options.onDelete && handlerFor(options.onDelete, (m) => m.modified),
      onInsert:
        options.onInsert && handlerFor(options.onInsert, (m) => m.modified),
      onUpdate:
        options.onUpdate && handlerFor(options.onUpdate, (m) => m.changes),
      shapeOptions: {
        // Electric ships Postgres column names; row types come from the
        // Drizzle tables, which spell them in camelCase.
        columnMapper: snakeCamelMapper(),
        onError: syncError.onError,
        url: new URL(`/api/sync/${options.shape}`, options.baseUrl).toString(),
      },
    })
  );

  const recover = (defect: unknown): SyncFailedError | EI | EU | ED =>
    new SyncFailedError({
      collection: options.shape,
      detail: String(defect),
    });

  return syncCollection(collection, {
    lastError: syncError.read,
    recover,
  });
};

export const useLiveResult = <
  TContext extends Context,
  const Sources extends readonly SyncProbe<unknown>[],
>(
  sources: Sources,
  query: (q: InitialQueryBuilder) => QueryBuilder<TContext>,
  deps: readonly unknown[] = []
): AsyncResult.AsyncResult<
  InferResultType<TContext>,
  SyncErrorOf<Sources[number]>
> => {
  const { data, isReady, isError } = useLiveQuery(query, [...deps]);

  return useMemo(() => {
    type Failure = SyncErrorOf<Sources[number]>;

    if (isError) {
      for (const probe of sources) {
        const failure = probe();
        if (Option.isSome(failure)) {
          return AsyncResult.fail<Failure, InferResultType<TContext>>(
            failure.value as Failure
          );
        }
      }
      return AsyncResult.failure<InferResultType<TContext>, Failure>(
        Cause.die(new Error("Live query failed with no source in error state"))
      );
    }

    return isReady
      ? AsyncResult.success<InferResultType<TContext>, Failure>(data)
      : AsyncResult.initial<InferResultType<TContext>, Failure>(true);
  }, [data, isReady, isError, sources]);
};

interface Persistable {
  readonly isPersisted: { readonly promise: Promise<unknown> };
}

export const useMutationResult = <C extends CollectionLike, E, P>(
  source: SyncCollection<C, E>,
  mutate: (collection: C, payload: P) => Persistable
): readonly [(payload: P) => void, AsyncResult.AsyncResult<void, E>] => {
  const [result, setResult] = useState<AsyncResult.AsyncResult<void, E>>(
    AsyncResult.initial<void, E>()
  );

  const run = useCallback(
    (payload: P) => {
      setResult((previous) => AsyncResult.waiting(previous));

      let transaction: Persistable;
      try {
        // Schema validation and duplicate-key rejections throw synchronously,
        // before any transaction exists to await.
        transaction = mutate(source.collection, payload);
      } catch (thrown) {
        setResult(AsyncResult.failure<void, E>(causeFromThrown<E>(thrown)));
        return;
      }

      transaction.isPersisted.promise.then(
        () => setResult(AsyncResult.success<void, E>(undefined)),
        (thrown: unknown) =>
          setResult(AsyncResult.failure<void, E>(causeFromThrown<E>(thrown)))
      );
    },
    [source, mutate]
  );

  return [run, result];
};

export interface CollectionLike {
  readonly status: CollectionStatus;
  readonly utils: UtilsRecord;
}

export type SyncProbe<E> = () => Option.Option<E>;

export interface SyncCollection<C extends CollectionLike, E> {
  readonly collection: C;
  readonly probe: SyncProbe<E>;
}

export type SyncErrorOf<S> = S extends SyncProbe<infer E> ? E : never;

export type ErrorOf<C> =
  C extends SyncCollection<infer _C, infer E> ? E : never;

interface SyncErrorCapture {
  readonly onError: (error: unknown) => void;
  readonly read: () => unknown;
}

/** Electric collections expose no `utils.lastError`. */
const syncErrorCapture = (): SyncErrorCapture => {
  let last: unknown;
  return {
    onError: (error: unknown) => {
      last = error;
    },
    read: () => last,
  };
};

const syncCollection = <C extends CollectionLike, E>(
  collection: C,
  options: {
    readonly recover: (defect: unknown) => E;
    readonly lastError?: () => unknown;
  }
): SyncCollection<C, E> => {
  const readError = options.lastError ?? (() => collection.utils.lastError);

  return {
    collection,
    probe: () =>
      collection.status === "error"
        ? Option.some(options.recover(readError()))
        : Option.none(),
  };
};

interface SingleMutation {
  readonly changes: unknown;
  readonly modified: unknown;
}

const handlerFor = <E>(
  write: CollectionWrite<E>,
  pick: (mutation: SingleMutation) => unknown
) =>
  effectWrite(
    (params: { transaction: { mutations: readonly SingleMutation[] } }) =>
      Effect.gen(function* () {
        const [mutation, ...rest] = params.transaction.mutations;

        if (mutation === undefined || rest.length > 0) {
          return yield* Effect.die(
            new Error("a sync write expects exactly one mutation")
          );
        }

        return yield* write.run(pick(mutation));
      })
  );

/** TanStack DB rolls back on a thrown rejection, so the `Cause` rides along. */
class SyncWriteFailure extends Error {
  readonly failureCause: Cause.Cause<unknown>;

  constructor(failureCause: Cause.Cause<unknown>) {
    super("Sync write failed");
    this.name = "SyncWriteFailure";
    this.failureCause = failureCause;
  }
}

const effectWrite =
  <Args, R, E>(write: (args: Args) => Effect.Effect<R, E>) =>
  async (args: Args): Promise<R> => {
    const exit = await Effect.runPromise(Effect.exit(write(args)));
    if (Exit.isFailure(exit)) {
      throw new SyncWriteFailure(exit.cause);
    }
    return exit.value;
  };

const causeFromThrown = <E>(thrown: unknown): Cause.Cause<E> =>
  thrown instanceof SyncWriteFailure
    ? (thrown.failureCause as Cause.Cause<E>)
    : Cause.die(thrown);
