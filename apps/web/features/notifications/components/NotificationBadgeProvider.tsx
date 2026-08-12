"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { Badge } from "@capawesome/capacitor-badge";
import { isFriemiIOSApp } from "@/features/mobile/push/clientPush";
import { parseUnreadBadgeCountsPayload } from "@/features/notifications/unreadBadgeCounts";
import { getUnreadBadgePollDelayMs } from "@/features/notifications/unreadBadgePolling";

const NOTIFICATION_BADGE_POLL_INTERVAL_MS =
  process.env.NODE_ENV === "development" ? 60000 : 45000;
const NOTIFICATION_BADGE_INITIAL_REFRESH_DELAY_MS = 1200;

type UnreadCountRefreshResult = "aborted" | "failed" | "success";

type NotificationBadgeContextValue = {
  refreshUnreadDirectMessageCount: () => Promise<void>;
  refreshUnreadNotificationCount: () => Promise<void>;
  setUnreadDirectMessageCount: (count: number) => void;
  setUnreadNotificationCount: (count: number) => void;
  unreadDirectMessageCount: number;
  unreadNotificationCount: number;
};

const NotificationBadgeContext =
  createContext<NotificationBadgeContextValue | null>(null);

function isNotificationsPath(pathname: string) {
  return pathname.split("/").includes("notifications");
}

function normalizeUnreadCount(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

export function NotificationBadgeProvider({
  children,
  enabled,
  initialUnreadDirectMessageCount = 0,
  initialUnreadNotificationCount,
}: {
  children: ReactNode;
  enabled: boolean;
  initialUnreadDirectMessageCount?: number;
  initialUnreadNotificationCount: number;
}) {
  const pathname = usePathname();
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasScheduledInitialRefreshRef = useRef(false);
  const refreshPromiseRef = useRef<Promise<UnreadCountRefreshResult> | null>(
    null,
  );
  const [unreadNotificationCount, setUnreadNotificationCountState] = useState(
    () => normalizeUnreadCount(initialUnreadNotificationCount),
  );
  const [unreadDirectMessageCount, setUnreadDirectMessageCountState] = useState(
    () => normalizeUnreadCount(initialUnreadDirectMessageCount),
  );

  const setUnreadNotificationCount = useCallback((count: number) => {
    setUnreadNotificationCountState(normalizeUnreadCount(count));
  }, []);

  const setUnreadDirectMessageCount = useCallback((count: number) => {
    setUnreadDirectMessageCountState(normalizeUnreadCount(count));
  }, []);

  const runUnreadCountRefresh = useCallback(() => {
    if (!enabled) {
      setUnreadNotificationCountState(0);
      setUnreadDirectMessageCountState(0);
      return Promise.resolve<UnreadCountRefreshResult>("success");
    }

    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const refreshPromise = (async () => {
      try {
        const response = await fetch("/api/navigation/unread-counts", {
          cache: "no-store",
          signal: abortController.signal,
        });

        if (response.status === 401) {
          setUnreadNotificationCountState(0);
          setUnreadDirectMessageCountState(0);
          return "success";
        }

        if (response.ok) {
          const counts = parseUnreadBadgeCountsPayload(await response.json());

          if (counts) {
            setUnreadNotificationCountState(counts.unreadNotificationCount);
            setUnreadDirectMessageCountState(counts.unreadMessageCount);
            return "success";
          }

          return "failed";
        }

        if (response.status !== 404 && response.status !== 405) {
          return "failed";
        }

        const [notificationResponse, messageResponse] = await Promise.all([
          fetch("/api/notifications/unread-count", {
            cache: "no-store",
            signal: abortController.signal,
          }),
          fetch("/api/direct-messages/unread-count", {
            cache: "no-store",
            signal: abortController.signal,
          }),
        ]);

        const notificationSucceeded =
          notificationResponse.status === 401 || notificationResponse.ok;
        const messageSucceeded =
          messageResponse.status === 401 || messageResponse.ok;

        if (notificationResponse.status === 401) {
          setUnreadNotificationCountState(0);
        } else if (notificationResponse.ok) {
          const payload = (await notificationResponse.json()) as {
            unreadCount?: unknown;
          };
          setUnreadNotificationCountState(
            normalizeUnreadCount(payload.unreadCount),
          );
        }

        if (messageResponse.status === 401) {
          setUnreadDirectMessageCountState(0);
        } else if (messageResponse.ok) {
          const payload = (await messageResponse.json()) as {
            unreadCount?: unknown;
          };
          setUnreadDirectMessageCountState(
            normalizeUnreadCount(payload.unreadCount),
          );
        }

        return notificationSucceeded && messageSucceeded ? "success" : "failed";
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return "aborted";
        }

        // Keep the last known values; these badges are non-critical.
        return "failed";
      }
    })();

    refreshPromiseRef.current = refreshPromise;
    void refreshPromise.then(() => {
      if (refreshPromiseRef.current === refreshPromise) {
        refreshPromiseRef.current = null;
      }
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    });

    return refreshPromise;
  }, [enabled]);

  const refreshUnreadCounts = useCallback(async () => {
    await runUnreadCountRefresh();
  }, [runUnreadCountRefresh]);

  const refreshUnreadNotificationCount = refreshUnreadCounts;
  const refreshUnreadDirectMessageCount = refreshUnreadCounts;

  useEffect(() => {
    setUnreadNotificationCountState(
      normalizeUnreadCount(initialUnreadNotificationCount),
    );
  }, [initialUnreadNotificationCount]);

  useEffect(() => {
    setUnreadDirectMessageCountState(
      normalizeUnreadCount(initialUnreadDirectMessageCount),
    );
  }, [initialUnreadDirectMessageCount]);

  useEffect(() => {
    if (!enabled) {
      hasScheduledInitialRefreshRef.current = false;
      return;
    }

    let consecutiveFailures = 0;
    let stopped = false;
    let timeoutId: number | null = null;

    const isActiveSurface = () =>
      document.visibilityState === "visible" &&
      window.navigator.onLine !== false;

    const clearScheduledRefresh = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const scheduleNextRefresh = (delayMs?: number) => {
      clearScheduledRefresh();

      if (stopped || !isActiveSurface()) {
        return;
      }

      timeoutId = window.setTimeout(
        () => {
          void refreshAndScheduleNext();
        },
        delayMs ??
          getUnreadBadgePollDelayMs({
            baseIntervalMs: NOTIFICATION_BADGE_POLL_INTERVAL_MS,
            consecutiveFailures,
          }),
      );
    };

    const refreshAndScheduleNext = async () => {
      clearScheduledRefresh();

      if (stopped || !isActiveSurface()) {
        return;
      }

      const result = await runUnreadCountRefresh();

      if (stopped) {
        return;
      }

      if (result === "success") {
        consecutiveFailures = 0;
      } else if (result === "failed") {
        consecutiveFailures += 1;
      }

      scheduleNextRefresh();
    };

    function refreshWhenVisible(event?: Event) {
      if (event instanceof CustomEvent) {
        let handledPayload = false;

        if (typeof event.detail?.unreadCount === "number") {
          setUnreadNotificationCountState(
            normalizeUnreadCount(event.detail.unreadCount),
          );
          handledPayload = true;
        }

        if (typeof event.detail?.unreadDirectMessageCount === "number") {
          setUnreadDirectMessageCountState(
            normalizeUnreadCount(event.detail.unreadDirectMessageCount),
          );
          handledPayload = true;
        }

        if (handledPayload) {
          consecutiveFailures = 0;
          scheduleNextRefresh();
          return;
        }
      }

      void refreshAndScheduleNext();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshAndScheduleNext();
      } else {
        clearScheduledRefresh();
      }
    };

    const handleOnline = () => void refreshAndScheduleNext();
    const handleOffline = () => clearScheduledRefresh();

    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("friemi:notifications-refresh", refreshWhenVisible);

    if (!hasScheduledInitialRefreshRef.current) {
      hasScheduledInitialRefreshRef.current = true;

      if (isNotificationsPath(pathname)) {
        scheduleNextRefresh();
      } else {
        scheduleNextRefresh(NOTIFICATION_BADGE_INITIAL_REFRESH_DELAY_MS);
      }
    } else if (isNotificationsPath(pathname)) {
      scheduleNextRefresh();
    } else {
      void refreshAndScheduleNext();
    }

    return () => {
      stopped = true;
      clearScheduledRefresh();
      window.removeEventListener("focus", refreshWhenVisible);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(
        "friemi:notifications-refresh",
        refreshWhenVisible,
      );
    };
  }, [enabled, pathname, runUnreadCountRefresh]);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [enabled],
  );

  useEffect(() => {
    if (!isFriemiIOSApp()) {
      return;
    }

    if (unreadNotificationCount <= 0) {
      Badge.clear().catch((error: unknown) => {
        console.error("Failed to clear iOS app badge", error);
      });
      return;
    }

    Badge.set({ count: unreadNotificationCount }).catch((error: unknown) => {
      console.error("Failed to set iOS app badge", error);
    });
  }, [unreadNotificationCount]);

  const value = useMemo(
    () => ({
      refreshUnreadDirectMessageCount,
      refreshUnreadNotificationCount,
      setUnreadDirectMessageCount,
      setUnreadNotificationCount,
      unreadDirectMessageCount,
      unreadNotificationCount,
    }),
    [
      refreshUnreadDirectMessageCount,
      refreshUnreadNotificationCount,
      setUnreadDirectMessageCount,
      setUnreadNotificationCount,
      unreadDirectMessageCount,
      unreadNotificationCount,
    ],
  );

  return (
    <NotificationBadgeContext.Provider value={value}>
      {children}
    </NotificationBadgeContext.Provider>
  );
}

export function useNotificationBadge(fallbackUnreadCount = 0) {
  const context = useContext(NotificationBadgeContext);

  if (context) {
    return context;
  }

  return {
    refreshUnreadDirectMessageCount: async () => undefined,
    refreshUnreadNotificationCount: async () => undefined,
    setUnreadDirectMessageCount: () => undefined,
    setUnreadNotificationCount: () => undefined,
    unreadDirectMessageCount: 0,
    unreadNotificationCount: normalizeUnreadCount(fallbackUnreadCount),
  };
}
