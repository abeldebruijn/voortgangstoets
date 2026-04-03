"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const OptimizedClerkProvider = ClerkProvider as unknown as (props: {
  children: ReactNode;
  __unstable_invokeMiddlewareOnAuthStateChange?: boolean;
}) => ReactNode;

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <OptimizedClerkProvider
      __unstable_invokeMiddlewareOnAuthStateChange={false}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </OptimizedClerkProvider>
  );
}
