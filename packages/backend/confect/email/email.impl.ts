import { Effect, Layer } from "effect";
import { ActionCtx } from "../_generated/services";
import { App } from "../app/app";
import { AppFunctionImpl, AppGroupImpl } from "../app/app.layer";
import { config } from "../config";
import email from "./email.spec";
import { renderWelcome } from "./email.utils";

const sendWelcome = AppFunctionImpl.make(email, "sendWelcome", ({ to, name }) =>
  Effect.gen(function* () {
    const ctx = yield* ActionCtx;
    const { mailer } = yield* App;
    const { resend: resendConfig, siteUrl } = yield* config.pipe(Effect.orDie);

    const html = yield* renderWelcome({ appUrl: siteUrl, name });

    yield* mailer.sendEmail(ctx, {
      from: resendConfig.fromEmail,
      to,
      subject: "Welcome",
      html,
    });

    return null;
  })
);

export default AppGroupImpl.make(email).pipe(
  Layer.provide(sendWelcome),
  AppGroupImpl.finalize
);
