import assert from "node:assert/strict";
import test from "node:test";
import {
  getActivityAgendaDateKey,
  getActivityAgendaDateRelation,
  getActivityAgendaGroupSortOptions,
  getActivityAgendaGroups,
  isLongRunningAgendaActivity,
} from "./activityAgenda";

test("groups single-day activities by Paris date and keeps long-running activities separate", () => {
  const groups = getActivityAgendaGroups([
    {
      id: "later",
      startAt: "2026-06-18T18:00:00.000Z",
    },
    {
      endAt: "2026-06-20T18:00:00.000Z",
      id: "long",
      startAt: "2026-06-18T09:00:00.000Z",
    },
    {
      id: "first",
      startAt: "2026-06-18T08:00:00.000Z",
    },
  ]);

  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0], {
    activities: [
      { id: "first", startAt: "2026-06-18T08:00:00.000Z" },
      { id: "later", startAt: "2026-06-18T18:00:00.000Z" },
    ],
    dateKey: "2026-06-18",
    kind: "date",
  });
  assert.equal(groups[1].kind, "longRunning");
  assert.equal(groups[1].activities[0]?.id, "long");
});

test("treats activities ending on the same Paris date as single-day", () => {
  assert.equal(
    isLongRunningAgendaActivity({
      endAt: "2026-06-17T21:30:00.000Z",
      startAt: "2026-06-17T18:00:00.000Z",
    }),
    false,
  );
});

test("detects relative date labels against the Paris date", () => {
  const now = new Date("2026-06-17T10:00:00.000Z");

  assert.equal(getActivityAgendaDateKey(now), "2026-06-17");
  assert.equal(getActivityAgendaDateRelation("2026-06-17", now), "today");
  assert.equal(getActivityAgendaDateRelation("2026-06-18", now), "tomorrow");
  assert.equal(getActivityAgendaDateRelation("2026-06-19", now), null);
});

test("can group activities in descending date order", () => {
  const groups = getActivityAgendaGroups(
    [
      {
        id: "first",
        startAt: "2026-06-18T08:00:00.000Z",
      },
      {
        id: "next-day",
        startAt: "2026-06-19T08:00:00.000Z",
      },
    ],
    getActivityAgendaGroupSortOptions("latest"),
  );

  assert.equal(groups[0].kind, "date");
  if (groups[0].kind === "date") {
    assert.equal(groups[0].dateKey, "2026-06-19");
  }
});

test("sorts activities within a date group by duration when requested", () => {
  const groups = getActivityAgendaGroups(
    [
      {
        endAt: "2026-06-18T20:00:00.000Z",
        id: "longer",
        startAt: "2026-06-18T08:00:00.000Z",
      },
      {
        endAt: "2026-06-18T12:00:00.000Z",
        id: "shorter",
        startAt: "2026-06-18T10:00:00.000Z",
      },
    ],
    getActivityAgendaGroupSortOptions("shortDuration"),
  );

  assert.equal(groups[0]?.activities[0]?.id, "shorter");
  assert.equal(groups[0]?.activities[1]?.id, "longer");
});
