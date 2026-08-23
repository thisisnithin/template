import { MiddlewareImpl } from "@confect/server";
import { Effect } from "effect";
import databaseSchema from "../_generated/schema";
import { Auth } from "../_generated/services";
import { CurrentUser, RequireUser, UnauthorizedError } from "./auth.middleware";

export const RequireUserImpl = MiddlewareImpl.make(
  databaseSchema,
  RequireUser,
  (next) =>
    Effect.gen(function* () {
      const auth = yield* Auth;

      const identity = yield* auth.getUserIdentity.pipe(
        Effect.mapError(
          () => new UnauthorizedError({ message: "No active session" })
        )
      );

      const user = CurrentUser.of({
        email: identity.email ?? "",
        id: identity.subject,
        image: identity.pictureUrl ?? null,
        name: identity.name ?? "",
      });

      return yield* next.pipe(
        Effect.provideService(CurrentUser, user),
        Effect.annotateLogs({ userEmail: user.email, userId: user.id })
      );
    })
);
