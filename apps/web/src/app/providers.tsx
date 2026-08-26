"use client";

import { ThemeProvider } from "next-themes";
import { posthog } from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { authClient } from "@/lib/auth-client";
import { identifyUser } from "@/lib/tracking";

export function Providers({ children }: { children: ReactNode }) {
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

  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <PostHogProvider client={posthog}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </PostHogProvider>
    </ThemeProvider>
  );
}
