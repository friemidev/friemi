"use client";

import { useEffect, useState } from "react";
import type { UnoReaction } from "../unoReactions";
import { useUnoNow } from "./useUnoClock";

// A reaction expires locally even when no new room snapshot arrives.
export function useUnoReactions(reactions: readonly UnoReaction[] = []) {
  const [tick, setTick] = useState(0);
  const clockNow = useUnoNow();
  const now = clockNow();
  useEffect(() => {
    const deadlines = reactions.map(reaction => reaction.expiresAt - clockNow()).filter(delay => delay > 0);
    if (!deadlines.length) return;
    const timer = setTimeout(() => setTick(value => value + 1), Math.min(...deadlines) + 10);
    return () => clearTimeout(timer);
  }, [reactions, tick, clockNow]);
  return new Map(reactions.filter(reaction => reaction.expiresAt > now).map(reaction => [reaction.seat, reaction]));
}
