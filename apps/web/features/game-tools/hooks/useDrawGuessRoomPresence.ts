"use client";

import { useEffect, useRef } from "react";
import { registerDrawGuessRoomPresence } from "../drawGuessRoomPresence";

/** The optional callback can suppress departure after a deliberate leave/kick. */
export function useDrawGuessRoomPresence(roomId: string, shouldDepart?: () => boolean) {
  const shouldDepartRef = useRef(shouldDepart);
  shouldDepartRef.current = shouldDepart;
  useEffect(() => registerDrawGuessRoomPresence(roomId, () => shouldDepartRef.current?.() ?? true), [roomId]);
}
