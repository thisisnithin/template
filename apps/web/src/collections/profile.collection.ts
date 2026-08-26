"use client";

import { UpdateNamePayload } from "@app/server/domains/profile/profile.rpc";
import type { UserSyncRow } from "@app/server/sync.registry";
import { env } from "@app/shared/env";
import {
  collectionWrite,
  defineElectricCollection,
  type ErrorOf,
} from "@app/sync/client";
import { rpc } from "@/lib/rpc";

export const profiles = defineElectricCollection({
  shape: "profile",
  baseUrl: env.NEXT_PUBLIC_APP_URL,
  getKey: (row: UserSyncRow) => row.id,
  onUpdate: collectionWrite(UpdateNamePayload, (payload) =>
    rpc((client) => client["profile.updateName"](payload))
  ),
});

export type ProfileError = ErrorOf<typeof profiles>;
