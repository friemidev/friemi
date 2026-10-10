import assert from "node:assert/strict";
import test from "node:test";
import { getActivityPaginationAlternateLinkHeader } from "./activity-pagination-alternates";

test("activity pagination alternates use the same page in every locale", () => {
  for (const locale of ["zh-CN", "en", "fr"]) {
    assert.equal(
      getActivityPaginationAlternateLinkHeader(
        new URL(`https://www.friemi.com/${locale}/activities?page=21`),
      ),
      [
        '<https://www.friemi.com/zh-CN/activities?page=21>; rel="alternate"; hreflang="zh-CN"',
        '<https://www.friemi.com/en/activities?page=21>; rel="alternate"; hreflang="en"',
        '<https://www.friemi.com/fr/activities?page=21>; rel="alternate"; hreflang="fr"',
      ].join(", "),
    );
  }
});

test("other activity URLs keep the middleware's existing alternate links", () => {
  for (const url of [
    "https://www.friemi.com/en/activities",
    "https://www.friemi.com/en/activities?page=1",
    "https://www.friemi.com/en/activities?page=101",
    "https://www.friemi.com/en/activities?page=02",
    "https://www.friemi.com/en/activities?page=2&q=games",
    "https://www.friemi.com/en/activities?page=2&page=3",
    "https://www.friemi.com/en/activities/event-123?page=2",
  ]) {
    assert.equal(getActivityPaginationAlternateLinkHeader(new URL(url)), null);
  }
});
