import { ApiClient } from "@/lib/api-client";

export const profileAtom = (userId: string) =>
  ApiClient.query("profile", "getProfile", { urlParams: { userId } });
