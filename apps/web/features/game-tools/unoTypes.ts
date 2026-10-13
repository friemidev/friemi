export const UNO_COLORS = ["red", "yellow", "green", "blue"] as const;
export type UnoColor = (typeof UNO_COLORS)[number];
export type UnoValue = `${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}` | "skip" | "reverse" | "draw2" | "wild" | "wild4";
export type UnoCard = { id: string; color: UnoColor | null; value: UnoValue };
export type UnoPhase = "LOBBY" | "PLAYING" | "CHALLENGE" | "ROUND_END" | "FINISHED";
export type UnoMatchMode = "score" | "single";
export type UnoRulesetVersion = 1 | 2 | 3;
export type UnoRuleSettings = { stackDraws: boolean; challengeDrawFour: boolean; allowActionFinish: boolean };
export type UnoRoomSettings = Partial<UnoRuleSettings> & { turnSeconds?: 30 | 60 | 90; matchMode?: UnoMatchMode };
export type UnoDrawPenalty = { value: "draw2" | "wild4"; count: number };
export type UnoRosterSeat = { seat: number; name: string };
export type UnoOptions = UnoRoomSettings & { targetScore?: number };
export type UnoPlayer = UnoRosterSeat & {
  hand: UnoCard[];
  handVersion: number;
  score: number;
  declared: boolean;
  episodeId: number;
  grace: boolean;
  /** Private v2 report window; absent in legacy matches. */
  unoReportOpen?: boolean;
};
export type UnoEvent = {
  id: number;
  kind: "DEAL" | "PLAY" | "DRAW" | "PASS" | "UNO" | "CAUGHT" | "FALSE_CATCH" | "CHALLENGE_WON" | "CHALLENGE_LOST" | "ACCEPT_DRAW_FOUR" | "COLOR" | "ROUND_WIN" | "TIMEOUT";
  seat: number;
  targetSeat?: number;
  count?: number;
  card?: UnoCard;
  color?: UnoColor;
};
export type UnoRoundResult = {
  roundNumber: number;
  winnerSeat: number;
  points: number;
  remaining: { seat: number; points: number; cardCount: number }[];
};
export type UnoState = Partial<UnoRuleSettings> & {
  rulesetVersion: UnoRulesetVersion;
  /** Public accumulated draw penalty; absent in pre-stacking matches. */
  pendingDraw?: UnoDrawPenalty | null;
  phase: UnoPhase;
  players: UnoPlayer[];
  turnSeat: number;
  dealerSeat: number;
  direction: 1 | -1;
  roundNumber: number;
  turnId: number;
  matchNumber: number;
  deadlineAt: number | null;
  turnSeconds: 30 | 60 | 90;
  targetScore: number;
  /** Absent in rooms persisted before match modes; those rooms use score mode. */
  matchMode?: UnoMatchMode;
  drawPile: UnoCard[];
  discard: UnoCard[];
  currentColor: UnoColor | null;
  drawnCardId: string | null;
  colorChoiceSeat: number | null;
  challenge: { offenderSeat: number; targetSeat: number; illegal: boolean } | null;
  events: UnoEvent[];
  eventId: number;
  falseReports: string[];
  caughtEpisodes: string[];
  roundResult: UnoRoundResult | null;
};
export type UnoViewerState = UnoRuleSettings & {
  rulesetVersion: UnoRulesetVersion;
  pendingDraw: UnoDrawPenalty | null;
  phase: UnoPhase;
  players: (UnoRosterSeat & { cardCount: number; score: number; episodeId: number })[];
  selfSeat: number;
  hand: UnoCard[];
  handVersion: number;
  declared: boolean;
  turnSeat: number;
  dealerSeat: number;
  direction: 1 | -1;
  roundNumber: number;
  turnId: number;
  matchNumber: number;
  deadlineAt: number | null;
  turnSeconds: 30 | 60 | 90;
  targetScore: number;
  matchMode: UnoMatchMode;
  currentColor: UnoColor | null;
  topCard: UnoCard | null;
  drawPileCount: number;
  drawnCardId: string | null;
  colorChoiceSeat: number | null;
  challenge: { offenderSeat: number; targetSeat: number } | null;
  events: UnoEvent[];
  roundResult: UnoRoundResult | null;
};
export type UnoAction =
  | { type: "PLAY"; cardId: string; color?: UnoColor; handVersion: number }
  | { type: "DRAW" }
  | { type: "PASS" }
  | { type: "CALL_UNO"; episodeId: number; handVersion?: number }
  | { type: "CATCH_UNO"; targetSeat: number; episodeId: number; roundNumber: number }
  | { type: "ACCEPT_DRAW_FOUR" }
  | { type: "CHALLENGE_DRAW_FOUR" }
  | { type: "CHOOSE_COLOR"; color: UnoColor }
  | { type: "NEXT_ROUND" }
  | { type: "REMATCH" };
export type UnoErrorCode = "INVALID_PLAYERS" | "INVALID_OPTIONS" | "WRONG_PHASE" | "NOT_A_PLAYER" | "NOT_YOUR_TURN" | "DEADLINE_EXPIRED" | "STALE_HAND" | "CARD_NOT_FOUND" | "CARD_NOT_PLAYABLE" | "LAST_CARD_MUST_BE_NUMBER" | "CHOOSE_COLOR" | "INVALID_COLOR" | "ALREADY_DREW" | "MUST_DRAW_FIRST" | "ONLY_DRAWN_CARD" | "INVALID_REPORT" | "DUPLICATE_REPORT" | "INVALID_ACTION";
export type UnoActionResult = { state: UnoState; error?: UnoErrorCode };
