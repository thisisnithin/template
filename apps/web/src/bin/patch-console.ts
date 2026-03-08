import { LoggerLayer } from "@app/shared/logger";
import { Effect, LogLevel, ManagedRuntime } from "effect";

// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ANSI escapes
const ANSI_RE = /\u001b\[[0-9;]*m/g;
let forwarding = false;

const format = (...args: readonly unknown[]) =>
  args
    .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
    .join(" ")
    .replace(ANSI_RE, "");

const isEffectLog = (args: readonly unknown[]) =>
  args.length === 1 &&
  typeof args[0] === "string" &&
  args[0].includes('"fiberId"');

/**
 * Patches `console.*` methods to route through Effect's structured logger.
 * Call once during server startup (e.g. from `instrumentation.ts`).
 */
export function patchConsole() {
  const original = { ...console };
  const runtime = ManagedRuntime.make(LoggerLayer);

  const emit = (level: LogLevel.LogLevel, ...args: readonly unknown[]) => {
    if (forwarding || isEffectLog(args)) {
      original.log(...args);
      return;
    }
    forwarding = true;
    runtime.runSync(Effect.logWithLevel(level, format(...args)));
    forwarding = false;
  };

  for (const [method, level] of [
    ["log", LogLevel.Info],
    ["info", LogLevel.Info],
    ["warn", LogLevel.Warning],
    ["error", LogLevel.Error],
    ["debug", LogLevel.Debug],
  ] as const) {
    console[method] = (...args: readonly unknown[]) => emit(level, ...args);
  }
}
