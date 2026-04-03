"use client";

import { Authenticated, Unauthenticated } from "convex/react";

import { HomeDashboard } from "@/app/_components/home/home-dashboard";
import { HomeSignInCard } from "@/app/_components/home/home-sign-in-card";
import Nav from "@/components/ui/nav";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="mx-auto flex min-h-[calc(100vh-61px)] w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
        <Authenticated>
          <HomeDashboard />
        </Authenticated>
        <Unauthenticated>
          <HomeSignInCard />
        </Unauthenticated>
      </main>
    </>
  );
}
