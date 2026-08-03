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
  kind: "AVALON" | "STORYTELLER" | "WEREWOLF";
  locale: string;
  privateSeatHref: string | null;
  seatNumber: number | null;
  title: string;
};
