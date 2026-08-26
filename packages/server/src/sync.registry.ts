import { user } from "@app/db/schemas/schema";
import type { ShapeDefinition } from "@app/sync/server";

export const SHAPES: Record<string, ShapeDefinition> = {
  profile: {
    table: user,
    scope: (userId) => ({ where: "id = $1", params: [userId] }),
  },
};

export type { UserSyncRow } from "@app/db/schemas/auth.effect";
