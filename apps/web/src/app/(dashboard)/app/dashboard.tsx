"use client";

import { UpdateNamePayload } from "@app/server/domains/profile/profile.rpc";
import { useLiveResult, useMutationResult } from "@app/sync/client";
import { useForm } from "@tanstack/react-form";
import { Schema } from "effect";
import { AsyncResult } from "effect/unstable/reactivity";
import { useRouter } from "next/navigation";
import { profiles } from "@/collections/profile.collection";
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { rpc } from "@/lib/rpc";
import { resetUser } from "@/lib/tracking";
import { useEffectResult } from "@/lib/use-effect-result";

const RenameValidator = Schema.toStandardSchemaV1(UpdateNamePayload);

function RenameForm({
  profile,
}: {
  profile: { readonly id: string; readonly name: string };
}) {
  const [rename, renameResult] = useMutationResult(
    profiles,
    (collection, payload: { id: string; name: string }) =>
      collection.update(payload.id, (draft) => {
        draft.name = payload.name;
      })
  );

  const form = useForm({
    defaultValues: { name: profile.name },
    onSubmit: ({ value }) => rename({ id: profile.id, name: value.name }),
    validators: { onSubmit: RenameValidator },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field name="name">
          {(field) => {
            const invalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={invalid}>
                <FieldLabel htmlFor={field.name}>Display name</FieldLabel>
                <div className="flex items-center gap-2">
                  <Input
                    aria-invalid={invalid}
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    value={field.state.value}
                  />
                  <Button size="sm" type="submit" variant="outline">
                    {AsyncResult.isWaiting(renameResult) ? <Spinner /> : "Save"}
                  </Button>
                </div>
                {invalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        {AsyncResult.matchWithError(renameResult, {
          onDefect: () => <FieldError>Could not save</FieldError>,
          onError: (error) => <FieldError>{error.message}</FieldError>,
          onInitial: () => null,
          onSuccess: () => null,
        })}
      </FieldGroup>
    </form>
  );
}

function HealthStatus() {
  const result = useEffectResult(rpc((client) => client["health.check"]()));

  return AsyncResult.matchWithError(result, {
    onDefect: () => <Badge variant="destructive">offline</Badge>,
    onError: (error) => <Badge variant="destructive">{error.message}</Badge>,
    onInitial: () => (
      <Badge variant="outline">
        <Spinner />
        Checking
      </Badge>
    ),
    onSuccess: (r) => <Badge variant="default">{r.value.status}</Badge>,
  });
}

function ProfileCard() {
  const profile = useLiveResult([profiles.probe], (q) =>
    q.from({ p: profiles.collection }).select(({ p }) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      image: p.image,
    }))
  );

  return AsyncResult.matchWithError(profile, {
    onDefect: () => (
      <p className="text-destructive text-sm">Failed to load profile</p>
    ),
    onError: (error) => (
      <p className="text-destructive text-sm">{error.message}</p>
    ),
    onInitial: () => <Spinner />,
    onSuccess: (r) => {
      const [row] = r.value;

      if (row === undefined) {
        return <p className="text-muted-foreground text-sm">No profile</p>;
      }

      return (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Avatar>
              {row.image && <AvatarImage src={row.image} />}
              <AvatarFallback>
                {row.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{row.name}</p>
              <p className="text-muted-foreground text-sm">{row.email}</p>
            </div>
          </div>

          <RenameForm profile={row} />
        </div>
      );
    },
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
          {session?.user.id && <ProfileCard />}
          <CardDescription>
            Server <HealthStatus />
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
