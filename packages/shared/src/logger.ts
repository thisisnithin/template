import { Logger, type LogLevel } from "effect";

const levelToLabel = (label: LogLevel.LogLevel["label"]) => {
  switch (label) {
    case "ALL":
    case "OFF":
    case "TRACE":
    case "DEBUG":
      return "debug";
    case "INFO":
      return "info";
    case "WARN":
      return "warn";
    case "ERROR":
      return "error";
    case "FATAL":
      return "fatal";
    default:
      return "info";
  }
};

const RailwayJsonLogger = Logger.replace(
  Logger.defaultLogger,
  Logger.withConsoleLog(
    Logger.map(Logger.structuredLogger, ({ logLevel, ...rest }) =>
      JSON.stringify({
        ...rest,
        level: levelToLabel(logLevel as LogLevel.LogLevel["label"]),
      })
    )
  )
);

export const LoggerLayer =
  process.env.NODE_ENV === "production" ? RailwayJsonLogger : Logger.pretty;
