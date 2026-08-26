"use client";

import { Button } from "@/components/ui/button";

export default function UnavailablePage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto grid w-full max-w-md gap-6 p-6">
        <div className="grid gap-2 text-center">
          <h1 className="font-semibold text-2xl">Service unavailable</h1>
          <p className="text-muted-foreground text-sm">
            We are having trouble connecting to our servers. Please try again
            later.
          </p>
        </div>
        <div className="flex justify-center">
          <Button onClick={() => window.location.reload()} variant="outline">
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
