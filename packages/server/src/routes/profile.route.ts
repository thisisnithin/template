import { Db } from "@app/db/client";
import { user } from "@app/db/schemas/schema";
import { HttpApiBuilder } from "@effect/platform";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { AppApi } from "../api";
import { catchRest } from "../catch";
import { NotFoundError } from "../errors";

export const ProfileRoute = HttpApiBuilder.group(
  AppApi,
  "profile",
  (handlers) =>
    handlers.handle(
      "getProfile",
      Effect.fn(function* ({ urlParams }) {
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
          .where(eq(user.id, urlParams.userId));

        if (!row) {
          return yield* Effect.fail(
            new NotFoundError({ message: "User not found" })
          );
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
