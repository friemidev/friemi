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

const NOTIFICATION_BADGE_POLL_INTERVAL_MS =
  process.env.NODE_ENV === "development" ? 60000 : 15000;
const NOTIFICATION_BADGE_INITIAL_REFRESH_DELAY_MS = 1200;

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

  const refreshUnreadNotificationCount = useCallback(async () => {
    if (!enabled) {
      setUnreadNotificationCountState(0);
      return;
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/notifications/unread-count", {
        cache: "no-store",
        signal: abortController.signal,
      });

      if (!response.ok) {
        if (response.status === 401) {
          setUnreadNotificationCountState(0);
        }
        return;
      }

      const payload = (await response.json()) as { unreadCount?: unknown };
      setUnreadNotificationCountState(
        normalizeUnreadCount(payload.unreadCount),
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }
  }, [enabled]);

  const refreshUnreadDirectMessageCount = useCallback(async () => {
    if (!enabled) {
      setUnreadDirectMessageCountState(0);
      return;
    }

    try {
      const response = await fetch("/api/direct-messages/unread-count", {
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status === 401) {
          setUnreadDirectMessageCountState(0);
        }
        return;
      }

      const payload = (await response.json()) as { unreadCount?: unknown };
      setUnreadDirectMessageCountState(
        normalizeUnreadCount(payload.unreadCount),
      );
    } catch {
      // Keep the last known value; this badge is non-critical.
    }
  }, [enabled]);

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

    if (isNotificationsPath(pathname)) return;

    if (!hasScheduledInitialRefreshRef.current) {
      hasScheduledInitialRefreshRef.current = true;
      const timeoutId = window.setTimeout(() => {
        void refreshUnreadNotificationCount();
        void refreshUnreadDirectMessageCount();
      }, NOTIFICATION_BADGE_INITIAL_REFRESH_DELAY_MS);

      return () => window.clearTimeout(timeoutId);
    }

    void refreshUnreadNotificationCount();
    void refreshUnreadDirectMessageCount();
  }, [
    enabled,
    pathname,
    refreshUnreadDirectMessageCount,
    refreshUnreadNotificationCount,
  ]);

  useEffect(() => {
    if (!enabled) return;

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
          return;
        }
      }

      if (document.visibilityState === "visible") {
        void refreshUnreadNotificationCount();
        void refreshUnreadDirectMessageCount();
      }
    }

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("friemi:notifications-refresh", refreshWhenVisible);

    const intervalId = window.setInterval(
      refreshWhenVisible,
      NOTIFICATION_BADGE_POLL_INTERVAL_MS,
    );

    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener(
        "friemi:notifications-refresh",
        refreshWhenVisible,
      );
      window.clearInterval(intervalId);
      abortControllerRef.current?.abort();
    };
  }, [
    enabled,
    refreshUnreadDirectMessageCount,
    refreshUnreadNotificationCount,
  ]);

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
