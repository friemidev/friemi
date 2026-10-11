import type { UnoAction, UnoViewerState } from "./unoTypes";
import type { DrawGuessCatId } from "./drawGuessCats";
import type { UnoReaction } from "./unoReactions";

export type UnoRoomView = {
  id: string;
  code: string;
  revision: number;
  serverNow?: number;
  hostSeat: number;
  viewerSeat: number;
  seats: { seat: number; name: string; avatarUrl: string | null; catId: DrawGuessCatId; ready: boolean; connected: boolean; returned: boolean }[];
  returnedToLobby: boolean;
  reactions: UnoReaction[];
  state: UnoViewerState;
};

export type UnoRoomCommand = {
  commandId: string;
  matchNumber: number;
  roundNumber: number;
  turnId: number;
  action: UnoAction | { type: "START" };
};
