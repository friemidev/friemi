export const UNO_REACTION_KINDS = ["laugh", "applause", "surprise"] as const;
export type UnoReactionKind = (typeof UNO_REACTION_KINDS)[number];

export const UNO_REACTION_DURATION_MS = 4_500;
export const UNO_REACTION_COOLDOWN_MS = 3_000;

export type UnoReaction = {
  id: string;
  seat: number;
  kind: UnoReactionKind;
  createdAt: number;
  expiresAt: number;
};

export function isUnoReactionKind(value: unknown): value is UnoReactionKind {
  return typeof value === "string" && (UNO_REACTION_KINDS as readonly string[]).includes(value);
}
