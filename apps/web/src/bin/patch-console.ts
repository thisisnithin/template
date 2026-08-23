import type { LogLevel } from "effect";
import { Effect, ManagedRuntime } from "effect";
import { LoggerLayer } from "@/lib/logger";

// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ANSI escapes
const ANSI_RE = /\u001B\[[0-9;]*m/gu;
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

  const emit = (level: LogLevel.Severity, ...args: readonly unknown[]) => {
    if (forwarding || isEffectLog(args)) {
      original.log(...args);
      return;
    }
    forwarding = true;
    runtime.runSync(Effect.logWithLevel(level)(format(...args)));
    forwarding = false;
  };

  for (const [method, level] of [
    ["log", "Info"],
    ["info", "Info"],
    ["warn", "Warn"],
    ["error", "Error"],
    ["debug", "Debug"],
  ] as const satisfies readonly (readonly [string, LogLevel.Severity])[]) {
    console[method] = (...args: readonly unknown[]) => emit(level, ...args);
  }
}
