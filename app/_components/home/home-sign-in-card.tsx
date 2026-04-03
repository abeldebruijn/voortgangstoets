"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

export function HomeSignInCard() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-2xl border bg-background p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Sign in to start practicing</h2>
        <p className="text-sm text-muted-foreground">
          Your dashboard and question history are only visible after login.
        </p>
      </div>
      <div className="flex gap-2">
        <SignInButton mode="modal">
          <Button>Sign in</Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button variant="outline">Sign up</Button>
        </SignUpButton>
      </div>
    </div>
  );
}
