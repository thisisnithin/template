"use client";

import { Effect } from "effect";
import { AsyncResult } from "effect/unstable/reactivity";
import { useEffect, useState } from "react";

export const useEffectResult = <A, E>(
  effect: Effect.Effect<A, E>,
  deps: readonly unknown[] = []
): AsyncResult.AsyncResult<A, E> => {
  const [result, setResult] = useState<AsyncResult.AsyncResult<A, E>>(
    AsyncResult.initial<A, E>(true)
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: `effect` is deliberately excluded — an inline Effect is a new value every render, so the caller's `deps` decides when this re-runs.
  useEffect(() => {
    let active = true;
    setResult(AsyncResult.initial<A, E>(true));

    Effect.runPromise(Effect.exit(effect)).then((exit) => {
      if (active) {
        setResult(AsyncResult.fromExit(exit));
      }
    });

    return () => {
      active = false;
    };
  }, [...deps]);

  return result;
};
