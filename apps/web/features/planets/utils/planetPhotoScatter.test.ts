import assert from "node:assert/strict";
import test from "node:test";
import { getPlanetPhotoScatterLayout } from "./planetPhotoScatter";

function containsPoint(
  card: ReturnType<typeof getPlanetPhotoScatterLayout>[number],
  x: number,
  y: number,
) {
  const centerX = card.leftPercent + card.widthPercent / 2;
  const centerY = card.topPercent * 1.5 + (card.heightPercent * 1.5) / 2;
  const radians = (-card.rotationDegrees * Math.PI) / 180;
  const offsetX = x - centerX;
  const offsetY = y - centerY;
  const localX =
    offsetX * Math.cos(radians) - offsetY * Math.sin(radians);
  const localY =
    offsetX * Math.sin(radians) + offsetY * Math.cos(radians);

  return (
    Math.abs(localX) <= card.widthPercent / 2 &&
    Math.abs(localY) <= (card.heightPercent * 1.5) / 2
  );
}

function getVisibleFraction(
  cards: ReturnType<typeof getPlanetPhotoScatterLayout>,
  cardIndex: number,
) {
  const card = cards[cardIndex];
  const sampleCount = 56;
  let visibleSamples = 0;

  for (let row = 0; row < sampleCount; row += 1) {
    for (let column = 0; column < sampleCount; column += 1) {
      const localX =
        ((column + 0.5) / sampleCount - 0.5) * card.widthPercent;
      const localY =
        ((row + 0.5) / sampleCount - 0.5) * card.heightPercent * 1.5;
      const radians = (card.rotationDegrees * Math.PI) / 180;
      const centerX = card.leftPercent + card.widthPercent / 2;
      const centerY =
        card.topPercent * 1.5 + (card.heightPercent * 1.5) / 2;
      const x =
        centerX +
        localX * Math.cos(radians) -
        localY * Math.sin(radians);
      const y =
        centerY +
        localX * Math.sin(radians) +
        localY * Math.cos(radians);
      const isInsideComponent = x >= 0 && x <= 100 && y >= 0 && y <= 150;
      const isCovered = cards
        .slice(cardIndex + 1)
        .some((laterCard) => containsPoint(laterCard, x, y));

      if (isInsideComponent && !isCovered) visibleSamples += 1;
    }
  }

  return visibleSamples / sampleCount ** 2;
}

test("scattered photos stay inside the component bounds", () => {
  for (const photoCount of [2, 3, 5, 8, 12, 15]) {
    const layout = getPlanetPhotoScatterLayout(photoCount);

    assert.equal(layout.length, photoCount);
    for (const card of layout) {
      assert.ok(card.leftPercent >= 0);
      assert.ok(card.topPercent >= 0);
      assert.ok(card.leftPercent + card.widthPercent <= 100);
      assert.ok(card.topPercent + card.heightPercent <= 100);
      assert.ok(Math.abs(card.rotationDegrees) <= 5);
    }
  }
});

test("scattered photos become smaller as the pile grows", () => {
  const twoPhotos = getPlanetPhotoScatterLayout(2)[0];
  const eightPhotos = getPlanetPhotoScatterLayout(8)[0];
  const twelvePhotos = getPlanetPhotoScatterLayout(12)[0];

  assert.ok(twoPhotos.widthPercent > eightPhotos.widthPercent);
  assert.ok(eightPhotos.widthPercent > twelvePhotos.widthPercent);
});

test("scattered photos stay large enough to read in a busy pile", () => {
  assert.ok(getPlanetPhotoScatterLayout(8)[0].widthPercent >= 42);
  assert.ok(getPlanetPhotoScatterLayout(12)[0].widthPercent >= 33);
  assert.ok(getPlanetPhotoScatterLayout(15)[0].widthPercent >= 30);
});

test("every scattered photo keeps at least half of its area visible", () => {
  for (const photoCount of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15]) {
    const layout = getPlanetPhotoScatterLayout(photoCount);
    const visibleFractions = layout.map((_, index) =>
      getVisibleFraction(layout, index),
    );

    assert.ok(
      Math.min(...visibleFractions) >= 0.5,
      `${photoCount} photos expose only ${Math.min(...visibleFractions)}`,
    );
  }
});

test("scattered photo positions are deterministic", () => {
  assert.deepEqual(
    getPlanetPhotoScatterLayout(8),
    getPlanetPhotoScatterLayout(8),
  );
});
