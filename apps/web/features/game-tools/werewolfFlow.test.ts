import assert from "node:assert/strict";
import test from "node:test";
import {
  canUseWerewolfAntidote,
  formatWerewolfSeatLabel,
  getWerewolfFactionAlert,
  getWerewolfFlowRecordLabel,
  getWerewolfNightActionLabel,
  getWerewolfNightActionSubmissionKey,
  getWerewolfNightCues,
  getWerewolfSeerResult,
  shouldShowWerewolfSuggestedSeat,
  tallyWerewolfVotes,
} from "@/features/game-tools/werewolfFlow";

test("scopes night-action idempotency by cue while keeping Witch to one choice", () => {
  assert.equal(getWerewolfNightActionSubmissionKey("CUPID"), "CUPID");
  assert.equal(getWerewolfNightActionSubmissionKey("LOVERS"), "LOVERS");
  assert.equal(getWerewolfNightActionSubmissionKey("WITCH_ANTIDOTE"), "WITCH");
  assert.equal(getWerewolfNightActionSubmissionKey("WITCH_POISON"), "WITCH");
  assert.equal(getWerewolfNightActionSubmissionKey("WITCH_PASS"), "WITCH");
});

test("shows a suggested seat only during a vote result stage", () => {
  assert.equal(shouldShowWerewolfSuggestedSeat("SHERIFF_RESULT"), true);
  assert.equal(shouldShowWerewolfSuggestedSeat("EXILE_RESULT"), true);
  assert.equal(shouldShowWerewolfSuggestedSeat("DAY_ANNOUNCEMENT"), false);
  assert.equal(shouldShowWerewolfSuggestedSeat("EXILE_VOTE"), false);
});

test("allows the antidote only after a confirmed wolf kill", () => {
  assert.equal(
    canUseWerewolfAntidote({
      hasWolfKill: false,
      isAntidoteUsed: false,
    }),
    false,
  );
  assert.equal(
    canUseWerewolfAntidote({
      hasWolfKill: true,
      isAntidoteUsed: false,
    }),
    true,
  );
  assert.equal(
    canUseWerewolfAntidote({
      hasWolfKill: true,
      isAntidoteUsed: true,
    }),
    false,
  );
});

test("uses the requested first-night role order", () => {
  const cues = getWerewolfNightCues(
    ["cupid", "guard", "werewolf", "seer", "witch"],
    1,
    "zh-CN",
  );

  assert.deepEqual(
    cues.map((cue) => cue.actionKind),
    ["NONE", "CUPID", "LOVERS", "GUARD", "WOLF_KILL", "SEER", "WITCH", "NONE"],
  );
});

test("localizes judge cues from the current route locale", () => {
  const roles = ["guard", "werewolf", "seer", "witch"];

  assert.equal(
    getWerewolfNightCues(roles, 1, "zh-CN")[0]?.lines[0],
    "天黑请闭眼。",
  );
  assert.equal(
    getWerewolfNightCues(roles, 1, "en")[0]?.lines[0],
    "Everyone, close your eyes.",
  );
  assert.equal(
    getWerewolfNightCues(roles, 1, "fr")[0]?.lines[0],
    "Tout le monde ferme les yeux.",
  );
});

test("localizes vote records and seat labels", () => {
  const voteEvent = {
    payload: { targetSeatNumber: 5, voterSeatNumber: 2 },
    type: "werewolf_exile_vote_submitted",
  };
  const abstainEvent = {
    payload: { targetSeatNumber: 0, voterSeatNumber: 2 },
    type: "werewolf_exile_vote_submitted",
  };

  assert.equal(formatWerewolfSeatLabel(3, "zh-CN"), "3号");
  assert.equal(formatWerewolfSeatLabel(3, "en"), "seat 3");
  assert.equal(formatWerewolfSeatLabel(3, "fr"), "siège 3");
  assert.equal(getWerewolfFlowRecordLabel(voteEvent, "zh-CN"), "2号 投给 5号");
  assert.equal(
    getWerewolfFlowRecordLabel(voteEvent, "en"),
    "Seat 2 voted for seat 5",
  );
  assert.equal(
    getWerewolfFlowRecordLabel(voteEvent, "fr"),
    "Le siège 2 a voté pour le siège 5",
  );
  assert.equal(
    getWerewolfFlowRecordLabel(abstainEvent, "fr"),
    "Le siège 2 s'est abstenu",
  );
});

test("localizes night action records", () => {
  assert.equal(
    getWerewolfNightActionLabel("WOLF_KILL", "zh-CN"),
    "狼人确认击杀",
  );
  assert.equal(
    getWerewolfNightActionLabel("WOLF_KILL", "en"),
    "Pack confirmed kill",
  );
  assert.equal(
    getWerewolfNightActionLabel("WOLF_KILL", "fr"),
    "Les loups ont confirmé leur cible",
  );
});

test("omits Cupid and lovers after the first night", () => {
  const cues = getWerewolfNightCues(
    ["cupid", "guard", "werewolf", "seer", "witch"],
    2,
    "zh-CN",
  );

  assert.equal(
    cues.some((cue) => cue.actionKind === "CUPID"),
    false,
  );
  assert.equal(
    cues.some((cue) => cue.actionKind === "LOVERS"),
    false,
  );
});

test("counts the sheriff vote as one and a half votes", () => {
  assert.deepEqual(
    tallyWerewolfVotes({
      sheriffSeatNumber: 2,
      votes: [
        { targetSeatNumber: 8, voterSeatNumber: 1 },
        { targetSeatNumber: 7, voterSeatNumber: 2 },
        { targetSeatNumber: 8, voterSeatNumber: 3 },
      ],
    }),
    { leaders: [8], totals: { 7: 1.5, 8: 2 } },
  );
});

test("reports tied leaders for a runoff", () => {
  assert.deepEqual(
    tallyWerewolfVotes({
      sheriffSeatNumber: null,
      votes: [
        { targetSeatNumber: 3, voterSeatNumber: 1 },
        { targetSeatNumber: 4, voterSeatNumber: 2 },
      ],
    }).leaders,
    [3, 4],
  );
});

test("reports third-party seer results", () => {
  assert.equal(
    getWerewolfSeerResult({
      roleAlignment: "good",
      seatNumber: 5,
      thirdPartySeatNumbers: [5, 6, 7],
    }),
    "THIRD_PARTY",
  );
});

test("alerts when all werewolves are dead", () => {
  assert.equal(
    getWerewolfFactionAlert({
      deadSeatNumbers: [1, 2],
      seats: [
        { roleAlignment: "werewolf", roleKey: "werewolf", seatNumber: 1 },
        { roleAlignment: "werewolf", roleKey: "wolf_king", seatNumber: 2 },
        { roleAlignment: "good", roleKey: "seer", seatNumber: 3 },
        { roleAlignment: "good", roleKey: "villager", seatNumber: 4 },
      ],
      thirdPartySeatNumbers: [],
    })?.kind,
    "WEREWOLVES_ELIMINATED",
  );
});

test("keeps the werewolf faction alive while Cupid follows that faction", () => {
  assert.equal(
    getWerewolfFactionAlert({
      cupidSeatNumber: 3,
      cupidSharedAlignment: "werewolf",
      deadSeatNumbers: [1, 2],
      seats: [
        { roleAlignment: "werewolf", roleKey: "werewolf", seatNumber: 1 },
        { roleAlignment: "werewolf", roleKey: "wolf_king", seatNumber: 2 },
        { roleAlignment: "good", roleKey: "cupid", seatNumber: 3 },
        { roleAlignment: "good", roleKey: "villager", seatNumber: 4 },
      ],
      thirdPartySeatNumbers: [],
    }),
    null,
  );

  assert.equal(
    getWerewolfFactionAlert({
      cupidSeatNumber: 3,
      cupidSharedAlignment: "werewolf",
      deadSeatNumbers: [1, 2, 3],
      seats: [
        { roleAlignment: "werewolf", roleKey: "werewolf", seatNumber: 1 },
        { roleAlignment: "werewolf", roleKey: "wolf_king", seatNumber: 2 },
        { roleAlignment: "good", roleKey: "cupid", seatNumber: 3 },
        { roleAlignment: "good", roleKey: "villager", seatNumber: 4 },
      ],
      thirdPartySeatNumbers: [],
    })?.kind,
    "WEREWOLVES_ELIMINATED",
  );
});

test("removes an elimination result after a faction member is revived", () => {
  const seats = [
    { roleAlignment: "werewolf", roleKey: "werewolf", seatNumber: 1 },
    { roleAlignment: "werewolf", roleKey: "wolf_king", seatNumber: 2 },
    { roleAlignment: "good", roleKey: "seer", seatNumber: 3 },
    { roleAlignment: "good", roleKey: "villager", seatNumber: 4 },
  ];

  assert.equal(
    getWerewolfFactionAlert({
      deadSeatNumbers: [1, 2],
      seats,
      thirdPartySeatNumbers: [],
    })?.kind,
    "WEREWOLVES_ELIMINATED",
  );
  assert.equal(
    getWerewolfFactionAlert({
      deadSeatNumbers: [1],
      seats,
      thirdPartySeatNumbers: [],
    }),
    null,
  );
});
