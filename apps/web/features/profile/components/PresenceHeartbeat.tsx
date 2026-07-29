"use client";

import { useEffect } from "react";

const heartbeatIntervalMs = 60 * 1000;
const heartbeatDedupeMs = 10 * 1000;
const foregroundEvents = [
  "focus",
  "online",
  "pageshow",
  "resume",
  "friemi:app-foreground",
  "friemi:android-ready",
  "friemi:android-resume",
] as const;
const backgroundEvents = [
  "pagehide",
  "pause",
  "friemi:app-background",
  "friemi:android-pause",
] as const;

export function PresenceHeartbeat() {
  useEffect(() => {
    let stopped = false;
    let heartbeatTimer: number | null = null;
    let lastPingAt = 0;

    const isActiveSurface = () =>
      document.visibilityState !== "hidden" && window.navigator.onLine !== false;

    const ping = ({ force = false }: { force?: boolean } = {}) => {
      if (stopped || !isActiveSurface()) {
        return;
      }

      const now = Date.now();

      if (!force && now - lastPingAt < heartbeatDedupeMs) {
        return;
      }

      lastPingAt = now;

      void fetch("/api/profile/presence", {
        cache: "no-store",
        keepalive: true,
        method: "POST",
      }).catch(() => {
        // Presence is best effort; UI will simply stop showing the green dot.
      });
    };

    const stopHeartbeat = () => {
      if (heartbeatTimer === null) {
        return;
      }

      window.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    };

    const startHeartbeat = ({ forcePing = false }: { forcePing?: boolean } = {}) => {
      if (!isActiveSurface()) {
        stopHeartbeat();
        return;
      }

      ping({ force: forcePing });

      if (heartbeatTimer === null) {
        heartbeatTimer = window.setInterval(ping, heartbeatIntervalMs);
      }
    };

    const handleForeground = () => startHeartbeat({ forcePing: true });
    const handleBackground = () => stopHeartbeat();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        startHeartbeat({ forcePing: true });
      } else {
        stopHeartbeat();
      }
    };

    for (const eventName of foregroundEvents) {
      window.addEventListener(eventName, handleForeground);
    }

    for (const eventName of backgroundEvents) {
      window.addEventListener(eventName, handleBackground);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    startHeartbeat({ forcePing: true });

    return () => {
      stopped = true;
      stopHeartbeat();
      for (const eventName of foregroundEvents) {
        window.removeEventListener(eventName, handleForeground);
      }
      for (const eventName of backgroundEvents) {
        window.removeEventListener(eventName, handleBackground);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
