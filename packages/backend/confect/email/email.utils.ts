import { WelcomeEmail } from "@app/email/welcome-email";
import { render } from "@react-email/render";
import { Effect } from "effect";

export const renderWelcome: (p: {
  readonly appUrl: string;
  readonly name: string;
}) => Effect.Effect<string> = Effect.fn("email.renderWelcome")(function* (p) {
  return yield* Effect.promise(() => render(WelcomeEmail(p)));
});
