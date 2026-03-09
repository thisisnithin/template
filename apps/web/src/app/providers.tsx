"use client";

import { RegistryProvider } from "@effect-atom/atom-react";
import { ThemeProvider } from "next-themes";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { type ReactNode, useEffect } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { authClient } from "@/lib/auth-client";
import { identifyUser } from "@/lib/tracking";

export function Providers({ children }: { children: ReactNode }) {
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (session?.user) {
      identifyUser({
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      });
    }
  }, [session?.user]);

  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <RegistryProvider>
        <PostHogProvider client={posthog}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </PostHogProvider>
      </RegistryProvider>
    </ThemeProvider>
  );
}
