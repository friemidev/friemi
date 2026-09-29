"use client";

import { useAuth, useSession } from "@clerk/nextjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { androidAuthReturnParamName } from "@/lib/auth-redirect";

type AuthSessionRefreshProps = {
  serverAuthenticated: boolean;
};

function isAuthRoute(pathname: string) {
  return /\/(?:sign-in|sign-up)(?:\/|$)/.test(pathname);
}

function isFriemiNativeApp() {
  return /\bFriemi(?:Android|IOS)\//i.test(window.navigator.userAgent);
}

const nativeForegroundEvents = [
  "resume",
  "friemi:app-foreground",
  "friemi:android-ready",
  "friemi:android-resume",
  "friemi:ios-resume",
] as const;

export function AuthSessionRefresh({
  serverAuthenticated,
}: AuthSessionRefreshProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { session } = useSession();
  const lastRefreshKeyRef = useRef<string | null>(null);
  const lastNativeSessionRefreshAtRef = useRef(0);
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const isNativeAuthReturn =
    searchParams.get(androidAuthReturnParamName) === "1";

  useEffect(() => {
    if (!isLoaded || isAuthRoute(pathname) || isNativeAuthReturn) {
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
    const refreshDelays = clientAuthenticated
      ? isFriemiNativeApp()
        ? [120]
        : [0, 650]
      : [5000];
    const refreshTimers = refreshDelays.map((delay) =>
      window.setTimeout(() => {
        router.refresh();
      }, delay),
    );

    return () => {
      refreshTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [
    isLoaded,
    isNativeAuthReturn,
    isSignedIn,
    pathname,
    routeKey,
    router,
    serverAuthenticated,
  ]);

  useEffect(() => {
    if (
      !isLoaded ||
      !isSignedIn ||
      isAuthRoute(pathname) ||
      isNativeAuthReturn ||
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
        await session?.touch({ intent: "focus" });
        const token = await getToken({ skipCache: true });

        if (active && token && !serverAuthenticated) {
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
    const keepAliveTimer = window.setInterval(
      refreshNativeSession,
      12 * 60 * 1000,
    );
    window.addEventListener("focus", refreshNativeSession);
    window.addEventListener("online", refreshNativeSession);
    window.addEventListener("pageshow", refreshNativeSession);
    for (const eventName of nativeForegroundEvents) {
      window.addEventListener(eventName, refreshNativeSession);
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(keepAliveTimer);
      window.removeEventListener("focus", refreshNativeSession);
      window.removeEventListener("online", refreshNativeSession);
      window.removeEventListener("pageshow", refreshNativeSession);
      for (const eventName of nativeForegroundEvents) {
        window.removeEventListener(eventName, refreshNativeSession);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    getToken,
    isLoaded,
    isNativeAuthReturn,
    isSignedIn,
    pathname,
    router,
    session,
    serverAuthenticated,
  ]);

  return null;
}
