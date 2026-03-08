import { ApiClient } from "@/lib/api-client";

export const profileAtom = ApiClient.query("profile", "getProfile", {});
