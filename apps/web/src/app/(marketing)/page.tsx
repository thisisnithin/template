import { AuthDialog } from "./auth-dialog";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="font-bold text-4xl">Welcome</h1>
      <p className="text-muted-foreground">Your marketing page goes here.</p>
      <AuthDialog />
    </div>
  );
}
