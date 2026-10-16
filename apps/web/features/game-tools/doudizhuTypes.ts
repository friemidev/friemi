/** Frozen rules for Friemi's three-player, score-bidding Dou Dizhu. */
export const DDZ_RULESET_VERSION = "friemi-ddz-v1" as const;
export type DdzPhase = "LOBBY" | "BIDDING" | "PLAYING" | "RESULT" | "CLOSED";
export type DdzSeat = number;
export type DdzCardId = string;
/** 3..14 (A), 15 (2), 16 (small joker), 17 (big joker). */
export type DdzCard = { id: DdzCardId; rank: number; suit: "clubs" | "diamonds" | "hearts" | "spades" | null };
export type DdzPatternType = "SINGLE" | "PAIR" | "TRIPLE" | "TRIPLE_SINGLE" | "TRIPLE_PAIR" | "STRAIGHT" | "PAIR_STRAIGHT" | "AIRPLANE" | "AIRPLANE_SINGLE" | "AIRPLANE_PAIR" | "FOUR_TWO_SINGLE" | "FOUR_TWO_PAIR" | "BOMB" | "ROCKET";
export type DdzPlay = { type: DdzPatternType; cardIds: DdzCardId[]; mainRank: number; chainLength: number; cardCount: number };
export type DdzTargetPlay = DdzPlay & { seat: DdzSeat };
export type DdzPlayer = { seat: DdzSeat; name: string; profileId?: string; catId?: string };
export type DdzRules = { bidSeconds: 20; playSeconds: 30; managedSeconds: 4; resultSeconds: 60; multiplierCap: 64 };
export type DdzBidState = { startSeat: DdzSeat; highestScore: 0 | 1 | 2 | 3; highestSeat: DdzSeat | null; bids: { seat: DdzSeat; score: 0 | 1 | 2 | 3 }[] };
export type DdzResult = {
  gameNo: number; winnerSeat: DdzSeat; winnerSide: "landlord" | "farmers"; landlordSeat: DdzSeat;
  baseScore: number; bombCount: number; spring: "spring" | "antiSpring" | null; multiplier: number; capped: boolean;
  scores: { seat: DdzSeat; delta: number }[]; finishedAt: number;
};
export type DdzEvent = {
  id: number; gameNo: number; dealNo: number; turnId: number; at: number;
  kind: "DEAL" | "BID" | "LANDLORD" | "PLAY" | "PASS" | "TRICK" | "MANAGED" | "TIMEOUT" | "RESULT" | "LOBBY";
  seat?: DdzSeat; score?: number; play?: DdzPlay; managed?: boolean; count?: number;
};
export type DdzState = {
  schemaVersion: 1; rulesetVersion: typeof DDZ_RULESET_VERSION; rules: DdzRules;
  gameNo: number; dealNo: number; turnId: number; trickId: number; eventSeq: number; phase: DdzPhase;
  players: DdzPlayer[]; hands: Record<number, DdzCardId[]>; handVersions: Record<number, number>;
  bottomCards: DdzCardId[]; landlordSeat: DdzSeat | null; bid: DdzBidState; currentSeat: DdzSeat | null;
  targetPlay: DdzTargetPlay | null; consecutivePasses: number; playedCards: DdzCardId[]; playCounts: Record<number, number>;
  multiplier: number; bombCount: number; managedSeats: DdzSeat[]; deadlineAt: number | null;
  result: DdzResult | null; events: DdzEvent[];
};
export type DdzViewerState = {
  schemaVersion: 1; rulesetVersion: typeof DDZ_RULESET_VERSION; rules: DdzRules; phase: DdzPhase;
  gameNo: number; dealNo: number; turnId: number; trickId: number; eventSeq: number;
  players: { seat: DdzSeat; name: string; catId?: string; cardCount: number; managed: boolean; gameRole: "landlord" | "farmer" | null }[];
  selfSeat: DdzSeat; hand: DdzCard[]; handVersion: number; bottomCards: DdzCard[]; bottomCardCount: number;
  landlordSeat: DdzSeat | null; bid: DdzBidState; currentSeat: DdzSeat | null; targetPlay: DdzTargetPlay | null;
  consecutivePasses: number; multiplier: number; bombCount: number; managedSeats: DdzSeat[]; deadlineAt: number | null;
  result: DdzResult | null; remainingHands: { seat: DdzSeat; cards: DdzCard[] }[] | null; events: DdzEvent[];
};
export type DdzAction =
  | { type: "BID"; score: 0 | 1 | 2 | 3 }
  | { type: "PLAY"; cardIds: DdzCardId[]; handVersion?: number }
  | { type: "PASS" }
  | { type: "SET_MANAGED"; managed: boolean };
export type DdzErrorCode = "INVALID_PLAYERS" | "INVALID_DECK" | "RANDOMNESS_REQUIRED" | "WRONG_PHASE" | "NOT_A_PLAYER" | "NOT_YOUR_TURN" | "DEADLINE_EXPIRED" | "STALE_HAND" | "CARD_NOT_FOUND" | "INVALID_COMBINATION" | "CANNOT_BEAT" | "MUST_LEAD" | "INVALID_BID" | "INVALID_ACTION";
export type DdzActionResult = { state: DdzState; error?: DdzErrorCode };
/** The server supplies a new, shuffled full deck only when a redeal is accepted. */
export type DdzDealSource = () => DdzCardId[];
export type DdzStartDeal = { deck: DdzCardId[]; firstBidSeat: DdzSeat };
