import { Cause, HashMap, Layer, Logger, type LogLevel } from "effect";
import { PostHog } from "posthog-node";
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

const PostHogLogger = (client: PostHog) =>
  Logger.make(({ logLevel, cause, message, annotations }) => {
    if (logLevel._tag !== "Error" && logLevel._tag !== "Fatal") {
      return;
    }

    const parsedAnnotations: Record<string, string> = {};
    HashMap.forEach(annotations, (value, key) => {
      parsedAnnotations[key] = String(value);
    });
    const { userId, ...properties } = parsedAnnotations;

    const error = Cause.isEmpty(cause) ? String(message) : Cause.squash(cause);

    client.captureException(error, userId, {
      ...properties,
      message: String(message),
      cause: Cause.pretty(cause, { renderErrorCause: true }),
    });
  });

const baseLogger =
  process.env.NODE_ENV === "production" ? RailwayJsonLogger : Logger.pretty;

export const LoggerLayer = env.NEXT_PUBLIC_POSTHOG_KEY
  ? Layer.merge(
      baseLogger,
      Logger.add(
        PostHogLogger(
          new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
            host: env.NEXT_PUBLIC_POSTHOG_HOST,
          })
        )
      )
    )
  : baseLogger;
