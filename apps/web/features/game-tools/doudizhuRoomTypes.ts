import type { DrawGuessCatId } from "./drawGuessCats";
import type { DdzAction, DdzMatchView, DdzPhase, DdzResult, DdzViewerState } from "./doudizhuTypes";
export type DdzReaction = { id: string; seat: number; kind: "wave" | "clap" | "cheer"; createdAt: number; expiresAt: number };
export type DdzRoomView = {
  id: string; code: string; revision: number; serverNow: number; hostSeat: number; viewerSeat: number;
  seats: { seat: number; name: string; avatarUrl: string | null; catId: DrawGuessCatId; ready: boolean; connected: boolean; returned: boolean; managed: boolean; left: boolean }[];
  returnedToLobby: boolean; reactions: DdzReaction[]; state: DdzViewerState;
};
export type DdzRoomCommand = { commandId: string; gameNo: number; dealNo: number; turnId: number; expectedPhase: DdzPhase; handVersion?: number; expectedRevision?: number; action: DdzAction | { type: "START" } };
export type DdzRoomMutation = { commandId: string; expectedRevision: number; gameNo: number; expectedPhase: DdzPhase };
export type DdzRoundSummary = { gameNo: number; finishedAt: string; rulesetVersion: string; result: DdzResult; match?: DdzMatchView; players: { seat: number; name: string; catId: DrawGuessCatId }[] };
