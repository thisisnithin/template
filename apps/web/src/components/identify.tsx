"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { identifyUser } from "@/lib/tracking";

export function Identify() {
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (session?.user) {
      identifyUser({
        email: session.user.email,
        id: session.user.id,
        name: session.user.name,
      });
    }
  }, [session?.user]);

  return null;
}
