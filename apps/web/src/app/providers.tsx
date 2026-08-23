"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Identify } from "@/components/identify";
import { providerAuthClient } from "@/lib/auth-client";
import { convexClient } from "@/lib/convex-client";

export function Providers({
  children,
  initialToken,
}: {
  children: ReactNode;
  initialToken?: string | null;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <ConvexBetterAuthProvider
        authClient={providerAuthClient}
        client={convexClient}
        initialToken={initialToken}
      >
        <Identify />
        <ErrorBoundary>{children}</ErrorBoundary>
      </ConvexBetterAuthProvider>
    </ThemeProvider>
  );
}
