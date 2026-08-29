"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

type AuthSessionRefreshProps = {
  serverAuthenticated: boolean;
};

function isAuthRoute(pathname: string) {
  return /\/(?:sign-in|sign-up)(?:\/|$)/.test(pathname);
}

export function AuthSessionRefresh({
  serverAuthenticated,
}: AuthSessionRefreshProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn } = useAuth();
  const lastRefreshKeyRef = useRef<string | null>(null);
  const routeKey = `${pathname}?${searchParams.toString()}`;

  useEffect(() => {
    if (!isLoaded || isAuthRoute(pathname)) {
      return;
    }

    const clientAuthenticated = Boolean(isSignedIn);

    if (clientAuthenticated === serverAuthenticated) {
      lastRefreshKeyRef.current = null;
      return;
    }

    const refreshKey = `${routeKey}:${serverAuthenticated}->${clientAuthenticated}`;

    if (lastRefreshKeyRef.current === refreshKey) {
      return;
    }

    lastRefreshKeyRef.current = refreshKey;
    // A native WebView can restore Clerk's cookie a moment after hydration.
    // Do not replace a valid server session with a transient anonymous client.
    const refreshDelays = clientAuthenticated ? [0, 650] : [5000];
    const refreshTimers = refreshDelays.map((delay) =>
      window.setTimeout(() => {
        router.refresh();
      }, delay),
    );

    return () => {
      refreshTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [isLoaded, isSignedIn, pathname, routeKey, router, serverAuthenticated]);

  return null;
}
