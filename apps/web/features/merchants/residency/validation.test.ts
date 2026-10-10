import assert from "node:assert/strict";
import test from "node:test";
import {
  canPublishResidencySlot,
  formatResidencyDate,
  getParisDateString,
  isFutureResidencyDate,
  parseResidencyActivityTime,
  parseResidencyDate,
} from "./validation";

test("residency dates are calendar dates in Paris, not browser instants", () => {
  assert.equal(
    getParisDateString(new Date("2026-10-07T22:30:00Z")),
    "2026-10-08",
  );
  assert.equal(
    formatResidencyDate(parseResidencyDate("2026-10-09")!),
    "2026-10-09",
  );
  assert.equal(parseResidencyDate("2026-02-30"), null);
  assert.equal(parseResidencyDate("2026-2-3"), null);
  assert.equal(
    isFutureResidencyDate(
      parseResidencyDate("2026-10-08")!,
      new Date("2026-10-07T22:30:00Z"),
    ),
    false,
  );
});

test("only confirmed dates that have not passed can open the publish form", () => {
  const now = new Date("2026-10-07T22:30:00Z"); // October 8 in Paris
  assert.equal(canPublishResidencySlot("CONFIRMED", "2026-10-07", now), false);
  assert.equal(canPublishResidencySlot("CONFIRMED", "2026-10-08", now), true);
  assert.equal(canPublishResidencySlot("CONFIRMED", "2026-10-09", now), true);
  assert.equal(canPublishResidencySlot("REJECTED", "2026-10-09", now), false);
});

test("LOCAL activity time keeps the selected wall clock through Paris summer time", () => {
  const date = parseResidencyDate("2026-07-20")!;
  const result = parseResidencyActivityTime(
    date,
    "19:30",
    new Date("2026-07-19T10:00:00Z"),
  );
  assert.equal(result?.toISOString(), "2026-07-20T19:30:00.000Z");
  assert.equal(
    parseResidencyActivityTime(date, "19:30", new Date("2026-07-20T18:00:00Z")),
    null,
  );
});

test("Paris spring DST gap is rejected while valid times remain floating", () => {
  const date = parseResidencyDate("2026-03-29")!;
  const now = new Date("2026-03-28T12:00:00Z");
  assert.equal(parseResidencyActivityTime(date, "02:30", now), null);
  assert.equal(
    parseResidencyActivityTime(date, "03:30", now)?.toISOString(),
    "2026-03-29T03:30:00.000Z",
  );
});

test("Paris autumn repeated hour is accepted once and keeps its displayed time", () => {
  const date = parseResidencyDate("2026-10-25")!;
  assert.equal(
    parseResidencyActivityTime(
      date,
      "02:30",
      new Date("2026-10-24T12:00:00Z"),
    )?.toISOString(),
    "2026-10-25T02:30:00.000Z",
  );
  assert.equal(
    parseResidencyActivityTime(
      date,
      "02:30",
      new Date("2026-10-25T01:00:00Z"),
    )?.toISOString(),
    "2026-10-25T02:30:00.000Z",
  );
});
