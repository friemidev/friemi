import assert from "node:assert/strict";
import test from "node:test";
import { getFavoriteButtonClassName } from "./favoriteButtonStyles";

test("compact hearts keep a 44px hit target with a smaller visual circle", () => {
  const classes = getFavoriteButtonClassName(undefined, { compact: true });
  assert.match(classes, /\bsize-11\b/);
  assert.match(classes, /\bmin-h-11\b/);
  assert.match(classes, /\bmin-w-11\b/);
  assert.match(classes, /before:inset-1\.5/);
  assert.match(classes, /before:bg-white\/95/);
  assert.doesNotMatch(classes, /\bsize-10\b/);
});

test("existing detail hearts retain their normal size", () => {
  const classes = getFavoriteButtonClassName();
  assert.match(classes, /\bsize-10\b/);
  assert.match(classes, /\bbg-white\/95\b/);
  assert.doesNotMatch(classes, /before:inset/);
});

test("liked and pending appearances remain available for compact hearts", () => {
  const classes = getFavoriteButtonClassName(undefined, {
    compact: true,
    isFavorited: true,
    pending: true,
  });
  assert.match(classes, /text-red-500/);
  assert.match(classes, /size-11/);
});
