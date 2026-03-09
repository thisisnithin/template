import { Db } from "@app/db/client";
import { user } from "@app/db/schemas/schema";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { catchRest } from "../../catch";
import { CurrentUser } from "../auth/auth.middleware";
import { ProfileNotFoundError } from "./profile.errors";
import { ProfileRpc } from "./profile.rpc";

export const ProfileHandler = ProfileRpc.toLayer(
  Effect.gen(function* () {
    const db = yield* Db;

    return ProfileRpc.of({
      "profile.getProfile": Effect.fnUntraced(function* () {
        const currentUser = yield* CurrentUser;
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
      }, catchRest),
    });
  })
);
