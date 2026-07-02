import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyParisOpenDataRecordDuration,
  selectBalancedParisOpenDataRecords,
} from "./importParisOpenDataActivities";

function record(id: string, startAt: string, endAt?: string | null) {
  return {
    date_end: endAt ?? null,
    date_start: startAt,
    id,
  };
}

test("classifies Paris OpenData records by practical event duration", () => {
  assert.equal(
    classifyParisOpenDataRecordDuration(
      record("single", "2026-07-10T08:00:00.000Z", "2026-07-10T20:00:00.000Z"),
    ),
    "single_day",
  );
  assert.equal(
    classifyParisOpenDataRecordDuration(
      record("short", "2026-07-10T08:00:00.000Z", "2026-07-12T20:00:00.000Z"),
    ),
    "short_span",
  );
  assert.equal(
    classifyParisOpenDataRecordDuration(
      record("medium", "2026-07-10T08:00:00.000Z", "2026-07-20T20:00:00.000Z"),
    ),
    "medium_span",
  );
  assert.equal(
    classifyParisOpenDataRecordDuration(
      record("long", "2026-07-10T08:00:00.000Z", "2026-08-20T20:00:00.000Z"),
    ),
    "long_span",
  );
});

test("selects more single-day candidates while keeping a small long-running fallback", () => {
  const candidates = [
    ...Array.from({ length: 6 }, (_, index) =>
      record(
        `single-${index}`,
        `2026-07-${String(index + 10).padStart(2, "0")}T10:00:00.000Z`,
        `2026-07-${String(index + 10).padStart(2, "0")}T18:00:00.000Z`,
      ),
    ),
    record("short-1", "2026-07-16T10:00:00.000Z", "2026-07-18T18:00:00.000Z"),
    record("short-2", "2026-07-17T10:00:00.000Z", "2026-07-19T18:00:00.000Z"),
    record("medium-1", "2026-07-18T10:00:00.000Z", "2026-07-28T18:00:00.000Z"),
    ...Array.from({ length: 5 }, (_, index) =>
      record(
        `long-${index}`,
        `2026-07-${String(index + 19).padStart(2, "0")}T10:00:00.000Z`,
        `2026-08-${String(index + 19).padStart(2, "0")}T18:00:00.000Z`,
      ),
    ),
  ];

  const selection = selectBalancedParisOpenDataRecords(candidates, 10);
  const selectedBuckets = new Map(
    selection.durationBuckets.map((bucket) => [bucket.key, bucket.selected]),
  );

  assert.equal(selection.records.length, 10);
  assert.equal(selectedBuckets.get("single_day"), 6);
  assert.equal(selectedBuckets.get("short_span"), 2);
  assert.equal(selectedBuckets.get("medium_span"), 1);
  assert.equal(selectedBuckets.get("long_span"), 1);
});

test("fills from long-running candidates when they are the only available source", () => {
  const candidates = Array.from({ length: 5 }, (_, index) =>
    record(
      `long-${index}`,
      `2026-07-${String(index + 10).padStart(2, "0")}T10:00:00.000Z`,
      `2026-08-${String(index + 10).padStart(2, "0")}T18:00:00.000Z`,
    ),
  );

  const selection = selectBalancedParisOpenDataRecords(candidates, 5);

  assert.equal(selection.records.length, 5);
  assert.equal(
    selection.durationBuckets.find((bucket) => bucket.key === "long_span")
      ?.selected,
    5,
  );
});

test("does not let earlier long-running events crowd out short-span candidates", () => {
  const candidates = [
    ...Array.from({ length: 4 }, (_, index) =>
      record(
        `long-${index}`,
        `2026-07-${String(index + 10).padStart(2, "0")}T10:00:00.000Z`,
        `2026-08-${String(index + 10).padStart(2, "0")}T18:00:00.000Z`,
      ),
    ),
    ...Array.from({ length: 4 }, (_, index) =>
      record(
        `short-${index}`,
        `2026-07-${String(index + 20).padStart(2, "0")}T10:00:00.000Z`,
        `2026-07-${String(index + 22).padStart(2, "0")}T18:00:00.000Z`,
      ),
    ),
  ];

  const selection = selectBalancedParisOpenDataRecords(candidates, 4);
  const selectedBuckets = new Map(
    selection.durationBuckets.map((bucket) => [bucket.key, bucket.selected]),
  );

  assert.equal(selection.records.length, 4);
  assert.equal(selectedBuckets.get("short_span"), 4);
  assert.equal(selectedBuckets.get("long_span"), 0);
});
