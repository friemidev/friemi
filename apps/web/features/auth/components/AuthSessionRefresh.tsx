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

function isFriemiNativeApp() {
  return /\bFriemi(?:Android|IOS)\//i.test(window.navigator.userAgent);
}

export function AuthSessionRefresh({
  serverAuthenticated,
}: AuthSessionRefreshProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const lastRefreshKeyRef = useRef<string | null>(null);
  const lastNativeSessionRefreshAtRef = useRef(0);
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

  useEffect(() => {
    if (
      !isLoaded ||
      !isSignedIn ||
      isAuthRoute(pathname) ||
      !isFriemiNativeApp()
    ) {
      return;
    }

    let active = true;
    const refreshNativeSession = async () => {
      if (
        document.visibilityState === "hidden" ||
        Date.now() - lastNativeSessionRefreshAtRef.current < 5 * 60 * 1000
      ) {
        return;
      }

      lastNativeSessionRefreshAtRef.current = Date.now();

      try {
        const token = await getToken({ skipCache: true });

        if (active && token) {
          router.refresh();
        }
      } catch (error) {
        console.warn("Failed to refresh native app session", error);
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshNativeSession();
      }
    };

    void refreshNativeSession();
    window.addEventListener("focus", refreshNativeSession);
    window.addEventListener("online", refreshNativeSession);
    window.addEventListener("pageshow", refreshNativeSession);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.removeEventListener("focus", refreshNativeSession);
      window.removeEventListener("online", refreshNativeSession);
      window.removeEventListener("pageshow", refreshNativeSession);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [getToken, isLoaded, isSignedIn, pathname, router]);

  return null;
}
