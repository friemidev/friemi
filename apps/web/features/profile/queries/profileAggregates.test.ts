import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWerewolfStatsFromGroups,
  buildWerewolfStatsFromRecords,
} from "./profileAggregates";

test("database groups preserve the legacy werewolf statistics", () => {
  const records = [
    { isJudge: true, result: null },
    { isJudge: true, result: "WIN" },
    { isJudge: false, result: "WIN" },
    { isJudge: false, result: "WIN" },
    { isJudge: false, result: "LOSE" },
    { isJudge: false, result: null },
  ];
  const groups = [
    { isJudge: true, result: null, _count: { _all: 1 } },
    { isJudge: true, result: "WIN", _count: { _all: 1 } },
    { isJudge: false, result: "WIN", _count: { _all: 2 } },
    { isJudge: false, result: "LOSE", _count: { _all: 1 } },
    { isJudge: false, result: null, _count: { _all: 1 } },
  ];

  assert.deepEqual(
    buildWerewolfStatsFromGroups(groups),
    buildWerewolfStatsFromRecords(records),
  );
});

test("empty werewolf history has a zero win rate", () => {
  assert.deepEqual(buildWerewolfStatsFromGroups([]), {
    judgeCount: 0,
    lossCount: 0,
    playerGameCount: 0,
    winCount: 0,
    winRate: 0,
  });
});
