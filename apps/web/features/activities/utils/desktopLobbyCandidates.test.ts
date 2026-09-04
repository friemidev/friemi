import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDesktopLobbyCandidateSourceUrl,
  getDesktopLobbyCandidateWindow,
  getOrderedPageSlices,
} from "./desktopLobbyCandidates";

test("candidate window starts after two hours and ends after fourteen days", () => {
  const reference = new Date("2026-09-04T10:00:00.000Z");

  assert.deepEqual(getDesktopLobbyCandidateWindow(reference), {
    from: new Date("2026-09-04T12:00:00.000Z"),
    to: new Date("2026-09-18T10:00:00.000Z"),
  });
});

test("ordered page slices cross from real groups into candidates", () => {
  assert.deepEqual(getOrderedPageSlices([5, 6, 10], 0, 8), [
    { skip: 0, take: 5 },
    { skip: 0, take: 3 },
    { skip: 0, take: 0 },
  ]);
  assert.deepEqual(getOrderedPageSlices([5, 6, 10], 8, 8), [
    { skip: 0, take: 0 },
    { skip: 3, take: 3 },
    { skip: 0, take: 5 },
  ]);
});

test("candidate source URL is stable and event-specific", () => {
  assert.equal(
    buildDesktopLobbyCandidateSourceUrl("event/with spaces"),
    "friemi://lobby-candidate/event%2Fwith%20spaces",
  );
});
