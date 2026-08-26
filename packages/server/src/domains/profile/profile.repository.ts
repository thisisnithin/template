import { Db } from "@app/db/client";
import { user } from "@app/db/schemas/schema";
import { recordTxid, withTxid } from "@app/sync/server";
import { eq } from "drizzle-orm";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core";
import { Context, Effect, Layer, Option } from "effect";
import { Profile, ProfileId } from "./profile.types";

export class ProfileRepository extends Context.Service<
  ProfileRepository,
  {
    readonly findById: (
      id: ProfileId
    ) => Effect.Effect<Option.Option<Profile>, EffectDrizzleQueryError>;
    readonly updateName: (p: {
      readonly id: ProfileId;
      readonly name: string;
    }) => Effect.Effect<Option.Option<Profile>, EffectDrizzleQueryError>;
  }
>()("@profile/ProfileRepository") {
  static readonly layerNoDeps = Layer.effect(
    ProfileRepository,
    Effect.gen(function* () {
      const db = yield* Db;

      const findById: (
        id: ProfileId
      ) => Effect.Effect<Option.Option<Profile>, EffectDrizzleQueryError> =
        Effect.fn("ProfileRepository.findById")(function* (id) {
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
            .where(eq(user.id, id));

          if (row === undefined) {
            return Option.none();
          }

          return Option.some(
            new Profile({
              id: ProfileId.make(row.id),
              name: row.name,
              email: row.email,
              image: Option.fromNullOr(row.image),
              emailVerified: row.emailVerified,
              createdAt: row.createdAt,
            })
          );
        });

      const updateName: (p: {
        readonly id: ProfileId;
        readonly name: string;
      }) => Effect.Effect<Option.Option<Profile>, EffectDrizzleQueryError> =
        Effect.fn("ProfileRepository.updateName")(function* ({ id, name }) {
          const [row] = yield* db
            .update(user)
            .set({ name })
            .where(eq(user.id, id))
            .returning(
              withTxid({
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt,
              })
            );

          if (row === undefined) {
            return Option.none();
          }

          yield* recordTxid(row.txid);

          return Option.some(
            new Profile({
              id: ProfileId.make(row.id),
              name: row.name,
              email: row.email,
              image: Option.fromNullOr(row.image),
              emailVerified: row.emailVerified,
              createdAt: row.createdAt,
            })
          );
        });

      return ProfileRepository.of({ findById, updateName });
    })
  );

  static readonly layer = ProfileRepository.layerNoDeps.pipe(
    Layer.provide(Db.layer)
  );
}
