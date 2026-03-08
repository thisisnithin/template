import * as Sentry from "@sentry/nextjs";
import { Cause, HashMap, Layer, Logger, type LogLevel } from "effect";
import { env } from "./env";

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

const SentryLogger = Logger.make(
  ({ logLevel, cause, message, annotations }) => {
    if (logLevel._tag !== "Error" && logLevel._tag !== "Fatal") {
      return;
    }

    const messageText = String(message);

    const sentryLevel =
      logLevel._tag === "Fatal" ? ("fatal" as const) : ("error" as const);

    const parsedAnnotations: Record<string, string> = {};
    HashMap.forEach(annotations, (value, key) => {
      parsedAnnotations[key] = String(value);
    });
    const { userId, userEmail, ...tags } = parsedAnnotations;
    const user =
      userId || userEmail ? { id: userId, email: userEmail } : undefined;

    if (Cause.isEmpty(cause)) {
      Sentry.captureMessage(messageText, { level: sentryLevel, user, tags });
      return;
    }

    Sentry.captureException(Cause.squash(cause), {
      level: sentryLevel,
      user,
      tags,
      extra: {
        message: messageText,
        cause: Cause.pretty(cause, { renderErrorCause: true }),
      },
    });
  }
);

const baseLogger =
  process.env.NODE_ENV === "production" ? RailwayJsonLogger : Logger.pretty;

const withSentry = env.NEXT_PUBLIC_SENTRY_DSN
  ? Logger.add(SentryLogger)
  : Layer.empty;

export const LoggerLayer = Layer.mergeAll(baseLogger, withSentry);
