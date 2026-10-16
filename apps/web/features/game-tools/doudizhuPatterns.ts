import { groupDdzCards, sortDdzCards } from "./doudizhuCards";
import type { DdzCardId, DdzPatternType, DdzPlay } from "./doudizhuTypes";

function consecutive(ranks: number[]): boolean {
  return ranks.length > 0 && ranks.at(-1)! <= 14 && ranks.every((rank, i) => i === 0 || rank === ranks[i - 1] + 1);
}
export function classifyDdzPlay(cardIds: readonly DdzCardId[]): DdzPlay | null {
  if (!cardIds.length || cardIds.length > 20) return null;
  const groups = groupDdzCards(cardIds);
  if (!groups) return null;
  const ranks = [...groups.keys()];
  const count = cardIds.length;
  const candidates: DdzPlay[] = [];
  const add = (type: DdzPatternType, mainRank: number, chainLength = 1) => candidates.push({ type, mainRank, chainLength, cardCount: count, cardIds: sortDdzCards(cardIds) });
  if (count === 1) add("SINGLE", ranks[0]);
  if (count === 2 && ranks.length === 1) add("PAIR", ranks[0]);
  if (count === 2 && groups.has(16) && groups.has(17)) add("ROCKET", 17);
  if (count === 3 && ranks.length === 1) add("TRIPLE", ranks[0]);
  if (count === 4 && ranks.length === 1) add("BOMB", ranks[0]);
  const triple = ranks.find((rank) => groups.get(rank)!.length === 3);
  if (count === 4 && ranks.length === 2 && triple !== undefined) add("TRIPLE_SINGLE", triple);
  if (count === 5 && ranks.length === 2 && triple !== undefined) add("TRIPLE_PAIR", triple);
  if (count >= 5 && ranks.length === count && consecutive(ranks)) add("STRAIGHT", ranks.at(-1)!, ranks.length);
  if (count >= 6 && count % 2 === 0 && ranks.every((rank) => groups.get(rank)!.length === 2) && consecutive(ranks)) add("PAIR_STRAIGHT", ranks.at(-1)!, ranks.length);
  for (const [type, width] of [["AIRPLANE", 3], ["AIRPLANE_SINGLE", 4], ["AIRPLANE_PAIR", 5]] as const) {
    const length = count / width;
    if (!Number.isInteger(length) || length < 2) continue;
    for (let start = 3; start + length - 1 <= 14; start++) {
      const core = Array.from({ length }, (_, i) => start + i);
      // A fourth core card cannot be a wing. It may instead remain in the hand.
      if (!core.every((rank) => groups.get(rank)?.length === 3)) continue;
      const wings = ranks.filter((rank) => !core.includes(rank));
      if (type === "AIRPLANE" && wings.length !== 0) continue;
      if (type !== "AIRPLANE" && (wings.length !== length || !wings.every((rank) => groups.get(rank)!.length === (width === 4 ? 1 : 2)))) continue;
      if (type === "AIRPLANE_SINGLE" && wings.includes(16) && wings.includes(17)) continue;
      add(type, start + length - 1, length);
    }
  }
  const quad = ranks.find((rank) => groups.get(rank)!.length === 4);
  if (quad !== undefined) {
    const wings = ranks.filter((rank) => rank !== quad);
    if (count === 6 && !(wings.includes(16) && wings.includes(17))) add("FOUR_TWO_SINGLE", quad);
    if (count === 8 && wings.length === 2 && wings.every((rank) => groups.get(rank)!.length === 2)) add("FOUR_TWO_PAIR", quad);
  }
  return candidates.sort((a, b) => b.mainRank - a.mainRank || b.chainLength - a.chainLength || a.type.localeCompare(b.type))[0] ?? null;
}

export function beatsDdzPlay(play: DdzPlay, target: DdzPlay | null): boolean {
  if (!target) return true;
  if (target.type === "ROCKET") return false;
  if (play.type === "ROCKET") return true;
  if (play.type === "BOMB" && target.type !== "BOMB") return true;
  return play.type === target.type && play.cardCount === target.cardCount && play.chainLength === target.chainLength && play.mainRank > target.mainRank;
}
