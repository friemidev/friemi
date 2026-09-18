import assert from "node:assert/strict";
import test from "node:test";
import { getCollapsedVoterNameCount } from "./voterNames";

test("all voter names remain visible when they fit on one line", () => {
  assert.equal(
    getCollapsedVoterNameCount({
      availableWidth: 180,
      moreWidths: [0, 24, 24, 24],
      voterWidths: [40, 50, 45],
    }),
    3,
  );
});

test("voter names collapse to the largest prefix that leaves room for +N", () => {
  assert.equal(
    getCollapsedVoterNameCount({
      availableWidth: 112,
      moreWidths: [0, 24, 24, 24],
      voterWidths: [40, 50, 45],
    }),
    1,
  );

  assert.equal(
    getCollapsedVoterNameCount({
      availableWidth: 118,
      moreWidths: [0, 24, 24, 24],
      voterWidths: [40, 50, 45],
    }),
    2,
  );
});

test("a very narrow voter row still keeps one name beside the counter", () => {
  assert.equal(
    getCollapsedVoterNameCount({
      availableWidth: 30,
      moreWidths: [0, 24, 24],
      voterWidths: [80, 50],
    }),
    1,
  );
});
