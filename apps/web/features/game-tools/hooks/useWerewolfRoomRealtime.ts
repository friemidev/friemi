"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";

import {
  createWerewolfRealtimeEventScheduler,
  getWerewolfRealtimeBrowserConfig,
  getWerewolfRealtimeTopic,
  WEREWOLF_REALTIME_EVENT,
} from "@/features/game-tools/werewolfRealtime";

export function useWerewolfRoomRealtime({
  onRoomChanged,
  roomId,
}: {
  onRoomChanged: () => void;
  roomId: string;
}) {
  const callbackRef = useRef(onRoomChanged);
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
    const eventScheduler = createWerewolfRealtimeEventScheduler(() =>
      callbackRef.current(),
    );
    const channel = client
      .channel(getWerewolfRealtimeTopic(roomId))
      .on("broadcast", { event: WEREWOLF_REALTIME_EVENT }, () => {
        eventScheduler.notify();
      })
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      eventScheduler.dispose();
      setIsConnected(false);
      void client.removeChannel(channel).finally(() => {
        client.realtime.disconnect();
      });
    };
  }, [roomId]);

  return isConnected;
}
