import assert from "node:assert/strict";
import test from "node:test";
import {
  getActivityFilterQueryString,
  getDefaultActivityTimeStates,
  hasActiveActivityFilters,
  normalizeActivityFilters,
} from "./activityFilters";

test("activity filters hide ended activities by default without serializing a time query", () => {
  const filters = normalizeActivityFilters({});

  assert.deepEqual(getDefaultActivityTimeStates(), ["UPCOMING", "ONGOING"]);
  assert.deepEqual(filters.timeStates, ["UPCOMING", "ONGOING"]);
  assert.equal(hasActiveActivityFilters(filters), false);
  assert.equal(getActivityFilterQueryString(filters), "");
});

test("activity filters serialize timing when ended activities are explicitly included", () => {
  const filters = normalizeActivityFilters({
    time: "UPCOMING,ONGOING,ENDED",
  });
  const query = new URLSearchParams(getActivityFilterQueryString(filters));

  assert.deepEqual(filters.timeStates, ["UPCOMING", "ONGOING", "ENDED"]);
  assert.equal(hasActiveActivityFilters(filters), true);
  assert.equal(query.get("time"), "UPCOMING,ONGOING,ENDED");
});
