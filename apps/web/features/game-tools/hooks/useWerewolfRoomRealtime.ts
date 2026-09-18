"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";

import {
  getWerewolfRealtimeBrowserConfig,
  getWerewolfRealtimeTopic,
  WEREWOLF_REALTIME_EVENT,
} from "@/features/game-tools/werewolfRealtime";

const realtimeEventThrottleMs = 750;

export function useWerewolfRoomRealtime({
  onRoomChanged,
  roomId,
}: {
  onRoomChanged: () => void;
  roomId: string;
}) {
  const callbackRef = useRef(onRoomChanged);
  const lastEventAtRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    callbackRef.current = onRoomChanged;
  }, [onRoomChanged]);

  useEffect(() => {
    const config = getWerewolfRealtimeBrowserConfig();

    if (!config) {
      setIsConnected(false);
      return;
    }

    const client = createClient(config.url, config.publishableKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
    const channel = client
      .channel(getWerewolfRealtimeTopic(roomId))
      .on("broadcast", { event: WEREWOLF_REALTIME_EVENT }, () => {
        const now = Date.now();

        if (now - lastEventAtRef.current < realtimeEventThrottleMs) {
          return;
        }

        lastEventAtRef.current = now;
        callbackRef.current();
      })
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      setIsConnected(false);
      void client.removeChannel(channel).finally(() => {
        client.realtime.disconnect();
      });
    };
  }, [roomId]);

  return isConnected;
}
