"use client";

import refs from "@app/backend/confect/_generated/refs";
import { QueryResult, useQuery } from "@confect/react";
import { Option } from "effect";
import { useRouter } from "next/navigation";
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
import { resetUser } from "@/lib/tracking";

function HealthStatus() {
  const result = useQuery(refs.public.health.health.check, {});
  return QueryResult.match(result, {
    onFailure: () => <Badge variant="destructive">offline</Badge>,
    onLoading: () => (
      <Badge variant="outline">
        <Spinner />
        Checking
      </Badge>
    ),
    onSuccess: (value) => <Badge variant="default">{value.status}</Badge>,
  });
}

function ProfileInfo() {
  const result = useQuery(refs.public.profile.profile.getProfile, {});
  return QueryResult.match(result, {
    onFailure: () => (
      <p className="text-destructive text-sm">Failed to load profile</p>
    ),
    onLoading: () => <Spinner />,
    onSuccess: (profile) => (
      <div className="flex items-center gap-3">
        <Avatar>
          {Option.isSome(profile.image) && (
            <AvatarImage src={profile.image.value} />
          )}
          <AvatarFallback>
            {profile.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{profile.name}</p>
          <p className="text-muted-foreground text-sm">{profile.email}</p>
        </div>
      </div>
    ),
  });
}

export function Dashboard() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut();
    resetUser();
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
            <CardDescription>
              Welcome back, {session?.user.name}
            </CardDescription>
          </div>
          <Button onClick={handleLogout} size="sm" variant="outline">
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
