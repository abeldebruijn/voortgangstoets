import { UserButton } from "@clerk/nextjs";
import { Authenticated } from "convex/react";

export default function nav() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div>
          <h1 className="text-lg font-semibold">Voortgangstoets</h1>
        </div>
        <Authenticated>
          <UserButton afterSignOutUrl="/" />
        </Authenticated>
      </div>
    </header>
  );
}
