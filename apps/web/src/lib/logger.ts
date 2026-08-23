import type { Layer } from "effect";
import { Logger } from "effect";

const JsonLogger = Logger.withLeveledConsole(
  Logger.map(Logger.formatStructured, (structured) =>
    JSON.stringify(structured)
  )
);

const baseLogger =
  process.env.NODE_ENV === "production" ? JsonLogger : Logger.consolePretty();

export const LoggerLayer: Layer.Layer<never> = Logger.layer([baseLogger]);
