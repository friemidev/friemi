import assert from "node:assert/strict";
import test from "node:test";
import {
  getActivityFilterQueryString,
  getActivityListCanonicalPath,
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

test("unfiltered activity pagination has a self canonical URL in each locale", () => {
  for (const locale of ["zh-CN", "en", "fr"]) {
    const path = `/${locale}/activities`;

    assert.equal(getActivityListCanonicalPath(path), path);
    assert.equal(getActivityListCanonicalPath(path, { page: "1" }), path);
    assert.equal(
      getActivityListCanonicalPath(path, { page: "2" }),
      `${path}?page=2`,
    );
    assert.equal(
      getActivityListCanonicalPath(path, { page: "03" }),
      `${path}?page=3`,
    );
  }
});

test("filtered activity result pages keep the listing canonical", () => {
  const path = "/en/activities";

  assert.equal(
    getActivityListCanonicalPath(path, { page: "2", q: "board games" }),
    path,
  );
  assert.equal(
    getActivityListCanonicalPath(path, { category: "BOARD_GAME", page: "2" }),
    path,
  );
});
