import * as Sentry from "@sentry/nextjs";
import type { Layer } from "effect";
import { Cause, Logger, References } from "effect";
import { env } from "./env";

const SentryLogger = Logger.make(({ cause, fiber, logLevel, message }) => {
  if (logLevel !== "Error" && logLevel !== "Fatal") {
    return;
  }

  const messageText = String(message);
  const sentryLevel =
    logLevel === "Fatal" ? ("fatal" as const) : ("error" as const);

  const parsedAnnotations: Record<string, string> = {};
  for (const [key, value] of Object.entries(
    fiber.getRef(References.CurrentLogAnnotations)
  )) {
    parsedAnnotations[key] = String(value);
  }
  const { userId, userEmail, ...tags } = parsedAnnotations;
  const user =
    userId || userEmail ? { email: userEmail, id: userId } : undefined;

  if (cause.reasons.length === 0) {
    Sentry.captureMessage(messageText, { level: sentryLevel, tags, user });
    return;
  }

  Sentry.captureException(Cause.squash(cause), {
    extra: { cause: Cause.pretty(cause), message: messageText },
    level: sentryLevel,
    tags,
    user,
  });
});

// Railway classifies severity from a lowercase `level`; Effect emits uppercase.
const levelToRailway = (level: string) => {
  switch (level) {
    case "TRACE":
    case "DEBUG": {
      return "debug";
    }
    case "WARN": {
      return "warn";
    }
    case "ERROR": {
      return "error";
    }
    case "FATAL": {
      return "fatal";
    }
    default: {
      return "info";
    }
  }
};

const RailwayJsonLogger = Logger.withConsoleLog(
  Logger.map(Logger.formatStructured, ({ level, ...rest }) =>
    JSON.stringify({ ...rest, level: levelToRailway(level) })
  )
);

const baseLogger =
  process.env.NODE_ENV === "production"
    ? RailwayJsonLogger
    : Logger.consolePretty();

export const LoggerLayer: Layer.Layer<never> = Logger.layer(
  env.NEXT_PUBLIC_SENTRY_DSN ? [baseLogger, SentryLogger] : [baseLogger]
);
