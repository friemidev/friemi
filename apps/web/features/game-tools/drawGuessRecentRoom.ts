import type { DrawGuessMode } from "./drawGuessEngine";
import { ACTIVE_GAME_TOOL_ROOM_STORAGE_EVENT, ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY } from "./activeGameToolRoomStorage";

export const DRAW_GUESS_RECENT_ROOM_EVENT = "friemi:draw-guess-recent-room-changed";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
const storageKey = (profileId: string) => `friemi:draw-guess-recent-room:${profileId}`;

export type DrawGuessRecentRoom = { id: string; code: string; mode: DrawGuessMode; visitedAt: number };

export function parseDrawGuessRecentRoom(raw: string | null, now = Date.now()): DrawGuessRecentRoom | null {
  try {
    const room = JSON.parse(raw ?? "null") as Partial<DrawGuessRecentRoom> | null;
    if (!room || typeof room.id !== "string" || !room.id || typeof room.code !== "string" || !/^[A-Z0-9]{6,8}$/.test(room.code) ||
      !["CLASSIC", "CHAIN"].includes(room.mode ?? "") || typeof room.visitedAt !== "number" || !Number.isFinite(room.visitedAt) ||
      room.visitedAt > now + 60_000 || now - room.visitedAt > MAX_AGE_MS) return null;
    return { id: room.id, code: room.code, mode: room.mode as DrawGuessMode, visitedAt: room.visitedAt };
  } catch { return null; }
}

export function readDrawGuessRecentRoom(profileId?: string | null) {
  if (!profileId || typeof window === "undefined") return null;
  try { return parseDrawGuessRecentRoom(window.localStorage.getItem(storageKey(profileId))); }
  catch { return null; }
}

export function rememberDrawGuessRecentRoom(profileId: string | null | undefined, room: Pick<DrawGuessRecentRoom, "id" | "code" | "mode">) {
  if (!profileId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(profileId), JSON.stringify({ ...room, visitedAt: Date.now() }));
    window.dispatchEvent(new Event(DRAW_GUESS_RECENT_ROOM_EVENT));
  } catch { /* The room remains usable if browser storage is unavailable. */ }
}

export function forgetDrawGuessRecentRoom(profileId: string | null | undefined, room: { id?: string; code?: string }) {
  if (typeof window === "undefined") return;
  try {
    const recent = readDrawGuessRecentRoom(profileId);
    if (profileId && recent && (recent.id === room.id || recent.code === room.code)) {
      window.localStorage.removeItem(storageKey(profileId));
      window.dispatchEvent(new Event(DRAW_GUESS_RECENT_ROOM_EVENT));
    }
    const active = JSON.parse(window.localStorage.getItem(ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY) ?? "null");
    if (active?.kind === "DRAW_GUESS" && (!active.profileId || active.profileId === profileId) && (active.id === room.id || active.code === room.code)) {
      window.localStorage.removeItem(ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY);
      window.dispatchEvent(new Event(ACTIVE_GAME_TOOL_ROOM_STORAGE_EVENT));
    }
  } catch { /* Storage is optional. */ }
}
