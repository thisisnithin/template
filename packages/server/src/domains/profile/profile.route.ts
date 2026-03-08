import { Db } from "@app/db/client";
import { user } from "@app/db/schemas/schema";
import { HttpApiBuilder } from "@effect/platform";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { AppApi } from "../../api";
import { catchRest } from "../../catch";
import { CurrentUser } from "../../middleware/auth.middleware";
import { ProfileNotFoundError } from "./profile.errors";

export const ProfileRoute = HttpApiBuilder.group(
  AppApi,
  "profile",
  (handlers) =>
    handlers.handle(
      "getProfile",
      Effect.fn("profile.getProfile")(function* () {
        const currentUser = yield* CurrentUser;
        const db = yield* Db;
        const [row] = yield* db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
          })
          .from(user)
          .where(eq(user.id, currentUser.id));

        if (!row) {
          return yield* new ProfileNotFoundError({ userId: currentUser.id });
        }

        return {
          id: row.id,
          name: row.name,
          email: row.email,
          image: row.image,
          emailVerified: row.emailVerified,
          createdAt: String(row.createdAt),
        };
      }, catchRest)
    )
);
