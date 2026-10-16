import { ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY } from "./activeGameToolRoomStorage";

type RoomStorage = Pick<Storage, "getItem" | "removeItem">;

/** Remove only this room's shortcuts. A live, deliberately left seat may resume. */
export function clearDdzRoomShortcuts(
  storage: RoomStorage,
  accountId: string,
  roomId: string,
  keepResume = false,
): boolean {
  let activeChanged = false;
  try {
    const active = JSON.parse(
      storage.getItem(ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY) ?? "null",
    );
    if (active?.kind === "DOUDIZHU" && active.id === roomId) {
      storage.removeItem(ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY);
      activeChanged = true;
    }
  } catch {
    /* Storage can be unavailable or contain an old invalid value. */
  }
  if (!keepResume) {
    try {
      const key = `friemi:ddz:resume:${accountId}`;
      const recent = JSON.parse(storage.getItem(key) ?? "null");
      if (recent?.id === roomId) storage.removeItem(key);
    } catch {
      /* The server remains authoritative. */
    }
  }
  return activeChanged;
}
