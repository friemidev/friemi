import type { DdzCard, DdzCardId } from "./doudizhuTypes";

const suits = [["c", "clubs"], ["d", "diamonds"], ["h", "hearts"], ["s", "spades"]] as const;
const deck: DdzCard[] = suits.flatMap(([prefix, suit]) => Array.from({ length: 13 }, (_, i) => ({ id: `${prefix}${i + 3}`, rank: i + 3, suit })));
deck.push({ id: "joker-small", rank: 16, suit: null }, { id: "joker-big", rank: 17, suit: null });
const byId = new Map(deck.map((card) => [card.id, card]));
export function createDdzDeck(): DdzCard[] { return deck.map((card) => ({ ...card })); }
export function getDdzCard(id: DdzCardId): DdzCard | null { const card = byId.get(id); return card ? { ...card } : null; }
export function sortDdzCards(ids: readonly DdzCardId[]): DdzCardId[] {
  return [...ids].sort((a, b) => (byId.get(a)?.rank ?? 0) - (byId.get(b)?.rank ?? 0) || a.localeCompare(b));
}
export function isDdzDeck(ids: readonly DdzCardId[]): boolean {
  return ids.length === 54 && new Set(ids).size === 54 && ids.every((id) => byId.has(id));
}
export function groupDdzCards(ids: readonly DdzCardId[]): Map<number, DdzCardId[]> | null {
  if (new Set(ids).size !== ids.length) return null;
  const groups = new Map<number, DdzCardId[]>();
  for (const id of sortDdzCards(ids)) {
    const card = byId.get(id);
    if (!card) return null;
    groups.set(card.rank, [...(groups.get(card.rank) ?? []), id]);
  }
  return groups;
}
