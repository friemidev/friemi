import { groupDdzCards } from "./doudizhuCards";
import { beatsDdzPlay, classifyDdzPlay } from "./doudizhuPatterns";
import type { DdzCard, DdzCardId, DdzPlay, DdzPatternType } from "./doudizhuTypes";

function combinations<T>(items: T[], count: number): T[][] {
  if (count === 0) return [[]];
  if (count > items.length) return [];
  const result: T[][] = [];
  const visit = (start: number, selected: T[]) => {
    if (selected.length === count) { result.push(selected); return; }
    for (let i = start; i <= items.length - (count - selected.length); i++) visit(i + 1, [...selected, items[i]]);
  };
  visit(0, []);
  return result;
}

/** Only private own-hand and public target inputs; no opponents or hidden deck. */
export function listDdzHints(hand: readonly DdzCardId[] | readonly DdzCard[], target: DdzPlay | null = null): DdzPlay[] {
  const ids = hand.map((card) => typeof card === "string" ? card : card.id);
  const groups = groupDdzCards(ids);
  if (!groups) return [];
  const ranks = [...groups.keys()];
  const candidates = new Map<string, DdzPlay>();
  const wants = (type: DdzPatternType, count?: number) => !target || type === "BOMB" || type === "ROCKET" || (type === target.type && (count === undefined || target.cardCount === count));
  const add = (cards: string[]) => {
    const play = classifyDdzPlay(cards);
    if (play && beatsDdzPlay(play, target)) candidates.set(play.cardIds.join(","), play);
  };
  for (const rank of ranks) {
    const cards = groups.get(rank)!;
    for (const [type, size] of [["SINGLE", 1], ["PAIR", 2], ["TRIPLE", 3], ["BOMB", 4]] as const) {
      if (wants(type) && cards.length >= size) add(cards.slice(0, size));
    }
    if (cards.length >= 3) {
      for (const [type, wingSize] of [["TRIPLE_SINGLE", 1], ["TRIPLE_PAIR", 2]] as const) {
        if (wants(type)) for (const wing of ranks.filter((r) => r !== rank && groups.get(r)!.length >= wingSize)) add([...cards.slice(0, 3), ...groups.get(wing)!.slice(0, wingSize)]);
      }
    }
    if (cards.length === 4) {
      const wingRanks = ranks.filter((r) => r !== rank);
      if (wants("FOUR_TWO_SINGLE")) {
        for (const pair of combinations(wingRanks, 2)) add([...cards, ...pair.map((r) => groups.get(r)![0])]);
        for (const r of wingRanks) if (groups.get(r)!.length >= 2) add([...cards, ...groups.get(r)!.slice(0, 2)]);
      }
      if (wants("FOUR_TWO_PAIR")) for (const pair of combinations(wingRanks.filter((r) => groups.get(r)!.length >= 2), 2)) add([...cards, ...pair.flatMap((r) => groups.get(r)!.slice(0, 2))]);
    }
  }
  if (groups.has(16) && groups.has(17)) add([groups.get(16)![0], groups.get(17)![0]]);
  for (const [type, width, minimum] of [["STRAIGHT", 1, 5], ["PAIR_STRAIGHT", 2, 3], ["AIRPLANE", 3, 2], ["AIRPLANE_SINGLE", 3, 2], ["AIRPLANE_PAIR", 3, 2]] as const) {
    const wingSize = type === "AIRPLANE_SINGLE" ? 1 : type === "AIRPLANE_PAIR" ? 2 : 0;
    for (let length = minimum; length <= Math.floor(ids.length / (width + wingSize)); length++) {
      if (!wants(type, length * (width + wingSize))) continue;
      for (let start = 3; start + length - 1 <= 14; start++) {
        const core = Array.from({ length }, (_, i) => start + i);
        if (!core.every((r) => (groups.get(r)?.length ?? 0) >= width)) continue;
        const cards = core.flatMap((r) => groups.get(r)!.slice(0, width));
        if (wingSize === 0) { add(cards); continue; }
        const available = ranks.filter((r) => !core.includes(r) && groups.get(r)!.length >= wingSize);
        for (const wings of combinations(available, length)) add([...cards, ...wings.flatMap((r) => groups.get(r)!.slice(0, wingSize))]);
      }
    }
  }
  const power = (play: DdzPlay) => play.type === "ROCKET" ? 2 : play.type === "BOMB" ? 1 : 0;
  const splitCost = (play: DdzPlay) => [...groupDdzCards(play.cardIds)!].reduce((cost, [rank, used]) => cost + (used.length < groups.get(rank)!.length ? groups.get(rank)!.length - used.length : 0), 0);
  return [...candidates.values()].sort((a, b) => power(a) - power(b) || a.mainRank - b.mainRank || splitCost(a) - splitCost(b) || b.cardCount - a.cardCount || a.type.localeCompare(b.type) || a.cardIds.join().localeCompare(b.cardIds.join())).slice(0, 128);
}
