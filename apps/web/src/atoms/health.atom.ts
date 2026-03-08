import { ApiClient } from "@/lib/api-client";

export const healthAtom = ApiClient.query("health", "check", {});
