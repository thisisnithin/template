import type { Cause } from "effect";
import { Effect, Layer, Logger, References } from "effect";
import { logLevel } from "./config";

export interface LogReport {
  readonly annotations: Record<string, unknown>;
  readonly cause: Cause.Cause<unknown>;
  readonly message: string;
}

const JsonLogger = Logger.withLeveledConsole(
  Logger.map(Logger.formatStructured, (structured) =>
    JSON.stringify(structured)
  )
);

const reportingLogger = (sink: (report: LogReport) => void) =>
  Logger.make(({ logLevel: level, message, cause, fiber }) => {
    if (level !== "Error" && level !== "Fatal") {
      return;
    }

    sink({
      message: String(message),
      cause,
      annotations: fiber.getRef(References.CurrentLogAnnotations),
    });
  });

export const makeLoggerLayer = (sink: (report: LogReport) => void) =>
  Layer.mergeAll(
    Logger.layer([JsonLogger, reportingLogger(sink)]),
    Layer.effect(References.MinimumLogLevel, logLevel.pipe(Effect.orDie))
  );
