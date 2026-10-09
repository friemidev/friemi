"use client";

import Link, { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ComponentProps } from "react";
import {
  getPendingNavigationRecoveryHref,
  PENDING_NAVIGATION_RECOVERY_DELAY_MS,
} from "@/features/navigation/pendingNavigationRecovery";

let latestPendingNavigationAttempt = 0;

function isFriemiNativeApp() {
  return /\bFriemi(?:Android|IOS)\//i.test(window.navigator.userAgent);
}

function NativePendingNavigationRecovery({ href }: { href: string }) {
  const { pending } = useLinkStatus();

  useEffect(() => {
    if (!pending || !isFriemiNativeApp()) return;

    const attempt = ++latestPendingNavigationAttempt;
    const startingHref = window.location.href;
    const startedAt = Date.now();
    const recover = () => {
      if (attempt !== latestPendingNavigationAttempt) return;

      const recoveryHref = getPendingNavigationRecoveryHref({
        currentHref: window.location.href,
        destinationHref: href,
        elapsedMs: Date.now() - startedAt,
        isOnline: window.navigator.onLine,
        isVisible: document.visibilityState === "visible",
        startingHref,
      });

      if (recoveryHref) {
        console.warn("Recovering stalled native app navigation", recoveryHref);
        window.location.assign(recoveryHref);
      }
    };

    const timer = window.setTimeout(
      recover,
      PENDING_NAVIGATION_RECOVERY_DELAY_MS,
    );
    window.addEventListener("online", recover);
    document.addEventListener("visibilitychange", recover);
    window.addEventListener("friemi:android-resume", recover);
    window.addEventListener("friemi:ios-resume", recover);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", recover);
      document.removeEventListener("visibilitychange", recover);
      window.removeEventListener("friemi:android-resume", recover);
      window.removeEventListener("friemi:ios-resume", recover);
    };
  }, [href, pending]);

  return null;
}

type IntentPrefetchLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  prefetchDelayMs?: number;
};

export function IntentPrefetchLink({
  children,
  href,
  onFocus,
  onMouseEnter,
  onMouseLeave,
  onTouchStart,
  prefetchDelayMs = 120,
  ...props
}: IntentPrefetchLinkProps) {
  const router = useRouter();
  const prefetchTimerRef = useRef<number | null>(null);
  const hasPrefetchedRef = useRef(false);

  useEffect(() => {
    hasPrefetchedRef.current = false;
    return () => {
      if (prefetchTimerRef.current !== null) {
        window.clearTimeout(prefetchTimerRef.current);
        prefetchTimerRef.current = null;
      }
    };
  }, [href]);

  function prefetchNow() {
    // A tap immediately navigates in the native WebView. Prefetching at that
    // instant can race with the actual route request after a background resume.
    if (hasPrefetchedRef.current || isFriemiNativeApp()) {
      return;
    }

    hasPrefetchedRef.current = true;
    router.prefetch(href);
  }

  function schedulePrefetch() {
    if (
      hasPrefetchedRef.current ||
      prefetchTimerRef.current !== null ||
      isFriemiNativeApp()
    ) {
      return;
    }

    prefetchTimerRef.current = window.setTimeout(() => {
      prefetchTimerRef.current = null;
      prefetchNow();
    }, prefetchDelayMs);
  }

  function cancelScheduledPrefetch() {
    if (prefetchTimerRef.current === null) {
      return;
    }

    window.clearTimeout(prefetchTimerRef.current);
    prefetchTimerRef.current = null;
  }

  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      onFocus={(event) => {
        prefetchNow();
        onFocus?.(event);
      }}
      onMouseEnter={(event) => {
        schedulePrefetch();
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        cancelScheduledPrefetch();
        onMouseLeave?.(event);
      }}
      onTouchStart={(event) => {
        prefetchNow();
        onTouchStart?.(event);
      }}
    >
      {children}
      <NativePendingNavigationRecovery href={href} />
    </Link>
  );
}
