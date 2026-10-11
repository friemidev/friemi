export const ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY =
  "friemi:active-game-tool-room";

export const DISMISSED_ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY =
  "friemi:dismissed-active-game-tool-room";

export const ACTIVE_GAME_TOOL_ROOM_STORAGE_EVENT =
  "friemi:active-game-tool-room-changed";

export type StoredActiveGameToolRoom = {
  code: string;
  href: string;
  id: string;
  kind: "AVALON" | "DRAW_GUESS" | "STORYTELLER" | "WEREWOLF";
  locale: string;
  privateSeatHref: string | null;
  /** Required for Draw & Guess shortcuts; older games retain their format. */
  profileId?: string | null;
  seatNumber: number | null;
  title: string;
};

export function canUseStoredActiveGameToolRoom(
  room: Pick<StoredActiveGameToolRoom, "kind" | "profileId">,
  profileId?: string | null,
) {
  return room.kind !== "DRAW_GUESS" || Boolean(profileId && room.profileId === profileId);
}

export function parseStoredActiveGameToolRoom(raw: string | null, locale: string, profileId?: string | null): StoredActiveGameToolRoom | null {
  try {
    const parsed = JSON.parse(raw ?? "null") as Partial<StoredActiveGameToolRoom> | null;
    if (!parsed || parsed.locale !== locale || !parsed.id || !parsed.href || !parsed.kind || !parsed.title ||
      !canUseStoredActiveGameToolRoom({ kind: parsed.kind, profileId: parsed.profileId }, profileId)) return null;
    return {
      code: parsed.code ?? "",
      href: parsed.href,
      id: parsed.id,
      kind: parsed.kind,
      locale: parsed.locale,
      privateSeatHref: parsed.privateSeatHref ?? null,
      ...(parsed.profileId ? { profileId: parsed.profileId } : {}),
      seatNumber: typeof parsed.seatNumber === "number" ? parsed.seatNumber : null,
      title: parsed.title,
    };
  } catch { return null; }
}
