"use client";

import { Result } from "@effect-atom/atom";
import { useAtomValue } from "@effect-atom/atom-react";
import { healthAtom } from "@/atoms/health.atom";
import { profileAtom } from "@/atoms/profile.atom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

function HealthStatus() {
  const result = useAtomValue(healthAtom);
  return Result.match(result, {
    onInitial: () => (
      <Badge variant="outline">
        <Spinner />
        Checking
      </Badge>
    ),
    onSuccess: (r) => <Badge variant="default">{r.value.status}</Badge>,
    onFailure: () => <Badge variant="destructive">offline</Badge>,
  });
}

function ProfileInfo() {
  const result = useAtomValue(profileAtom);
  return Result.match(result, {
    onInitial: () => <Spinner />,
    onSuccess: (r) => (
      <div className="flex items-center gap-3">
        <Avatar>
          {r.value.image && <AvatarImage src={r.value.image} />}
          <AvatarFallback>
            {r.value.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{r.value.name}</p>
          <p className="text-muted-foreground text-sm">{r.value.email}</p>
        </div>
      </div>
    ),
    onFailure: () => (
      <p className="text-destructive text-sm">Failed to load profile</p>
    ),
  });
}

export function Dashboard() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut();
    router.push("/");
  }

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Dashboard</CardTitle>
            <CardDescription>Welcome back, {session?.user.name}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </CardHeader>
        <Separator />
        <CardContent className="flex flex-col gap-4">
          {session?.user.id && <ProfileInfo />}
          <CardDescription>
            Server <HealthStatus />
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
