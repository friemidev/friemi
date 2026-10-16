import assert from "node:assert/strict";
import test from "node:test";
import { beatsDdzPlay, classifyDdzPlay, createDdzDeck, listDdzHints } from "./doudizhuEngine";

const deck = createDdzDeck();
function cards(...ranks: number[]) {
  const used = new Map<number, number>();
  return ranks.map((rank) => {
    const index = used.get(rank) ?? 0;
    used.set(rank, index + 1);
    return deck.filter((card) => card.rank === rank)[index].id;
  });
}
test("bounded hints retain rocket after hundreds of legal wing choices with a disjoint public target", () => {
  const hand = cards(6, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 3, 4, 5, 10, 11, 12, 16, 17);
  const remaining = deck.filter((card) => !hand.includes(card.id));
  const target = classifyDdzPlay([
    ...remaining.filter((card) => card.rank === 3), ...remaining.filter((card) => card.rank === 4),
    remaining.find((card) => card.rank === 5)!, remaining.find((card) => card.rank === 10)!,
  ].map((card) => card.id))!;
  assert.equal(target.type, "AIRPLANE_SINGLE");
  const hints = listDdzHints(hand, target);
  assert.equal(hints.length, 128);
  assert.equal(hints.at(-1)?.type, "ROCKET");
  assert.ok(hints.slice(0, -1).every((hint) => hint.type === "AIRPLANE_SINGLE"));
  assert.deepEqual(hints, listDdzHints([...hand].reverse(), target));
  for (const hint of hints) {
    assert.ok(beatsDdzPlay(hint, target));
    assert.ok(hint.cardIds.every((id) => hand.includes(id)));
    assert.deepEqual(classifyDdzPlay(hint.cardIds), hint);
  }
});

test("free-lead hint cap keeps every bomb and rocket after ordinary combinations", () => {
  const hand = cards(3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 8, 9, 10, 16, 17);
  const hints = listDdzHints(hand);
  assert.equal(hints.length, 128);
  assert.deepEqual(hints.slice(-3).map((hint) => [hint.type, hint.mainRank]), [["BOMB", 3], ["BOMB", 4], ["ROCKET", 17]]);
  assert.ok(hints.slice(0, -3).every((hint) => hint.type !== "BOMB" && hint.type !== "ROCKET"));
  assert.equal(new Set(hints.map((hint) => hint.cardIds.join())).size, hints.length);
});
