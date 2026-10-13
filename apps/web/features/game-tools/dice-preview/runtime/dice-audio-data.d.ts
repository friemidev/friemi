export type DiceAudioSprite = { offset: number; duration: number };
export const diceAudioData: {
  url: string;
  duration: number;
  groups: Record<"1" | "3" | "6", {
    shake: DiceAudioSprite[];
    covered: DiceAudioSprite[];
    landing: DiceAudioSprite[];
    closedTick: DiceAudioSprite[];
  }>;
};
