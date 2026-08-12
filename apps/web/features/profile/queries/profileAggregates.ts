export type WerewolfRecordSummary = {
  isJudge: boolean;
  result: string | null;
};

export type WerewolfRecordGroup = WerewolfRecordSummary & {
  _count: {
    _all: number;
  };
};

export type WerewolfStats = {
  judgeCount: number;
  lossCount: number;
  playerGameCount: number;
  winCount: number;
  winRate: number;
};

function finalizeWerewolfStats({
  judgeCount,
  lossCount,
  playerGameCount,
  winCount,
}: Omit<WerewolfStats, "winRate">): WerewolfStats {
  return {
    judgeCount,
    lossCount,
    playerGameCount,
    winCount,
    winRate:
      playerGameCount > 0 ? Math.round((winCount / playerGameCount) * 100) : 0,
  };
}

export function buildWerewolfStatsFromRecords(
  records: WerewolfRecordSummary[],
) {
  const judgeCount = records.filter((record) => record.isJudge).length;
  const playerRecords = records.filter((record) => !record.isJudge);

  return finalizeWerewolfStats({
    judgeCount,
    lossCount: playerRecords.filter((record) => record.result === "LOSE")
      .length,
    playerGameCount: playerRecords.length,
    winCount: playerRecords.filter((record) => record.result === "WIN").length,
  });
}

export function buildWerewolfStatsFromGroups(groups: WerewolfRecordGroup[]) {
  let judgeCount = 0;
  let lossCount = 0;
  let playerGameCount = 0;
  let winCount = 0;

  for (const group of groups) {
    const count = group._count._all;

    if (group.isJudge) {
      judgeCount += count;
      continue;
    }

    playerGameCount += count;

    if (group.result === "WIN") {
      winCount += count;
    } else if (group.result === "LOSE") {
      lossCount += count;
    }
  }

  return finalizeWerewolfStats({
    judgeCount,
    lossCount,
    playerGameCount,
    winCount,
  });
}
