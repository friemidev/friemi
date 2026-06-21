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

const NOTIFICATION_BADGE_POLL_INTERVAL_MS =
  process.env.NODE_ENV === "development" ? 60000 : 15000;
const NOTIFICATION_BADGE_INITIAL_REFRESH_DELAY_MS = 3500;

type NotificationBadgeContextValue = {
  refreshUnreadNotificationCount: () => Promise<void>;
  setUnreadNotificationCount: (count: number) => void;
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
  initialUnreadNotificationCount,
}: {
  children: ReactNode;
  enabled: boolean;
  initialUnreadNotificationCount: number;
}) {
  const pathname = usePathname();
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasScheduledInitialRefreshRef = useRef(false);
  const [unreadNotificationCount, setUnreadNotificationCountState] = useState(
    () => normalizeUnreadCount(initialUnreadNotificationCount),
  );

  const setUnreadNotificationCount = useCallback((count: number) => {
    setUnreadNotificationCountState(normalizeUnreadCount(count));
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

  useEffect(() => {
    setUnreadNotificationCountState(
      normalizeUnreadCount(initialUnreadNotificationCount),
    );
  }, [initialUnreadNotificationCount]);

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
      }, NOTIFICATION_BADGE_INITIAL_REFRESH_DELAY_MS);

      return () => window.clearTimeout(timeoutId);
    }

    void refreshUnreadNotificationCount();
  }, [enabled, pathname, refreshUnreadNotificationCount]);

  useEffect(() => {
    if (!enabled) return;

    function refreshWhenVisible(event?: Event) {
      if (
        event instanceof CustomEvent &&
        typeof event.detail?.unreadCount === "number"
      ) {
        setUnreadNotificationCountState(
          normalizeUnreadCount(event.detail.unreadCount),
        );
        return;
      }

      if (document.visibilityState === "visible") {
        void refreshUnreadNotificationCount();
      }
    }

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener(
      "nextfun:notifications-refresh",
      refreshWhenVisible,
    );

    const intervalId = window.setInterval(
      refreshWhenVisible,
      NOTIFICATION_BADGE_POLL_INTERVAL_MS,
    );

    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener(
        "nextfun:notifications-refresh",
        refreshWhenVisible,
      );
      window.clearInterval(intervalId);
      abortControllerRef.current?.abort();
    };
  }, [enabled, refreshUnreadNotificationCount]);

  const value = useMemo(
    () => ({
      refreshUnreadNotificationCount,
      setUnreadNotificationCount,
      unreadNotificationCount,
    }),
    [
      refreshUnreadNotificationCount,
      setUnreadNotificationCount,
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
    refreshUnreadNotificationCount: async () => undefined,
    setUnreadNotificationCount: () => undefined,
    unreadNotificationCount: normalizeUnreadCount(fallbackUnreadCount),
  };
}
