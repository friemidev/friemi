"use client";

import { useEffect, useState } from "react";
import { DRAW_GUESS_RECENT_ROOM_EVENT, readDrawGuessRecentRoom, type DrawGuessRecentRoom } from "../drawGuessRecentRoom";

export function useDrawGuessRecentRoom(profileId?: string | null) {
  const [recent, setRecent] = useState<{ profileId: string; room: DrawGuessRecentRoom | null } | null>(null);
  useEffect(() => {
    const update = () => setRecent(profileId ? { profileId, room: readDrawGuessRecentRoom(profileId) } : null);
    update();
    window.addEventListener("storage", update);
    window.addEventListener("focus", update);
    window.addEventListener(DRAW_GUESS_RECENT_ROOM_EVENT, update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("focus", update);
      window.removeEventListener(DRAW_GUESS_RECENT_ROOM_EVENT, update);
    };
  }, [profileId]);
  return recent?.profileId === profileId ? recent?.room ?? null : null;
}
