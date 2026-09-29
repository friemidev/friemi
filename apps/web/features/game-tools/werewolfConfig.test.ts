import assert from "node:assert/strict";
import test from "node:test";
import {
  getWerewolfPlayerJudgeLabel,
  getWerewolfRoleCopy,
  getWerewolfRoleLabel,
  getWerewolfUSeatColumns,
  getWerewolfVariant,
  getWerewolfVariantFromRoomConfig,
  getWerewolfVariantLabel,
  isActiveWerewolfJudgeSeat,
  isActiveWerewolfPlayerSeat,
  normalizeWerewolfRoleDeck,
  werewolfRoleAlignments,
  werewolfRoleKeys,
  werewolfRoleLabels,
  werewolfVariants,
  type WerewolfRoleLocale,
} from "./werewolfConfig";

test("defines every Werewolf role in Chinese, English, and French", () => {
  const locales: WerewolfRoleLocale[] = ["zh-CN", "en", "fr"];

  locales.forEach((locale) => {
    const roleCopy = getWerewolfRoleCopy(locale);

    werewolfRoleKeys.forEach((roleKey) => {
      assert.equal(
        getWerewolfRoleLabel(locale, roleKey),
        werewolfRoleLabels[locale][roleKey],
      );
      assert.ok(werewolfRoleLabels[locale][roleKey].length > 0);
      assert.ok(roleCopy.roleDescriptions[roleKey].length > 0);
    });
  });
});

test("keeps the Chinese Werewolf role labels explicit", () => {
  assert.deepEqual(werewolfRoleLabels["zh-CN"], {
    cupid: "丘比特",
    guard: "守卫",
    hunter: "猎人",
    idiot: "白痴",
    knight: "骑士",
    lovers: "情侣",
    seer: "预言家",
    villager: "平民",
    werewolf: "狼人",
    white_wolf_king: "白狼王",
    witch: "女巫",
    wolf_king: "狼王",
  });
});

test("accepts every available role and recognizes wolf kings as wolves", () => {
  assert.equal(werewolfRoleKeys.length, 12);
  assert.equal(werewolfRoleAlignments.wolf_king, "werewolf");
  assert.equal(werewolfRoleAlignments.white_wolf_king, "werewolf");
  assert.deepEqual(
    normalizeWerewolfRoleDeck([
      "wolf_king",
      "guard",
      "knight",
      "cupid",
      "villager",
    ]),
    ["wolf_king", "guard", "knight", "cupid", "villager"],
  );
});

test("labels Werewolf modes by players plus the separate judge seat", () => {
  assert.equal(getWerewolfPlayerJudgeLabel("zh-CN", 12), "12人+法官");
  assert.equal(getWerewolfPlayerJudgeLabel("en", 12), "12 players + judge");
  assert.equal(getWerewolfPlayerJudgeLabel("fr", 12), "12 joueurs + maître");

  werewolfVariants.forEach((variant) => {
    assert.equal(
      getWerewolfVariantLabel("zh-CN", variant),
      `${variant.playerSeatCount}人+法官`,
    );
    assert.doesNotMatch(getWerewolfVariantLabel("zh-CN", variant), /局/);
  });
});

test("keeps an existing room on its stored role and judge-seat snapshot", () => {
  const variant = getWerewolfVariantFromRoomConfig(
    {
      judgeSeatNumber: 12,
      playerSeatCount: 11,
      roleDeck: [
        "werewolf",
        "werewolf",
        "werewolf",
        "werewolf",
        "seer",
        "witch",
        "hunter",
        "idiot",
        "villager",
        "villager",
        "villager",
      ],
      totalSeats: 12,
      variantKey: "twelve_player_idiot",
    },
    "zh-CN",
  );

  assert.equal(variant.playerSeatCount, 11);
  assert.equal(variant.judgeSeatNumber, 12);
  assert.equal(variant.totalSeats, 12);
  assert.equal(getWerewolfVariantLabel("zh-CN", variant), "11人+法官");
});

test("defines both twelve-player setups with a separate judge seat", () => {
  const idiotSetup = getWerewolfVariant("twelve_player_idiot");
  const guardSetup = getWerewolfVariant("twelve_player_guard_wolf_king");

  assert.equal(idiotSetup.playerSeatCount, 12);
  assert.equal(idiotSetup.judgeSeatNumber, 13);
  assert.equal(idiotSetup.totalSeats, 13);
  assert.deepEqual(
    idiotSetup.roles.reduce<Record<string, number>>((counts, role) => {
      counts[role] = (counts[role] ?? 0) + 1;
      return counts;
    }, {}),
    {
      hunter: 1,
      idiot: 1,
      seer: 1,
      villager: 4,
      werewolf: 4,
      witch: 1,
    },
  );

  assert.equal(guardSetup.playerSeatCount, 12);
  assert.equal(guardSetup.judgeSeatNumber, 13);
  assert.equal(guardSetup.totalSeats, 13);
  assert.deepEqual(
    guardSetup.roles.reduce<Record<string, number>>((counts, role) => {
      counts[role] = (counts[role] ?? 0) + 1;
      return counts;
    }, {}),
    {
      guard: 1,
      hunter: 1,
      seer: 1,
      villager: 4,
      werewolf: 3,
      witch: 1,
      wolf_king: 1,
    },
  );
});

test("orders player seats around the table as a U", () => {
  const seats = Array.from({ length: 12 }, (_, index) => ({
    seatNumber: index + 1,
  }));
  const columns = getWerewolfUSeatColumns(seats);

  assert.deepEqual(
    columns.left.map((seat) => seat.seatNumber),
    [1, 2, 3, 4, 5, 6],
  );
  assert.deepEqual(
    columns.right.map((seat) => seat.seatNumber),
    [12, 11, 10, 9, 8, 7],
  );
});

test("accepts only occupied active player seats for game actions", () => {
  const variant = getWerewolfVariant("twelve_player_idiot");
  const activeSeat = {
    guestName: null,
    leftAt: null,
    profileId: "profile-1",
    seatNumber: 1,
  };

  assert.equal(isActiveWerewolfPlayerSeat(activeSeat, variant), true);
  assert.equal(
    isActiveWerewolfPlayerSeat({ ...activeSeat, profileId: null }, variant),
    false,
  );
  assert.equal(
    isActiveWerewolfPlayerSeat({ ...activeSeat, leftAt: new Date() }, variant),
    false,
  );
  assert.equal(
    isActiveWerewolfPlayerSeat(
      { ...activeSeat, seatNumber: variant.judgeSeatNumber },
      variant,
    ),
    false,
  );
  assert.equal(
    isActiveWerewolfPlayerSeat(
      { ...activeSeat, guestName: "Guest", profileId: null },
      variant,
    ),
    true,
  );
});

test("accepts only an occupied active judge seat for judge actions", () => {
  const variant = getWerewolfVariant("twelve_player_idiot");
  const judgeSeat = {
    guestName: "Judge",
    leftAt: null,
    profileId: null,
    seatNumber: variant.judgeSeatNumber,
  };

  assert.equal(isActiveWerewolfJudgeSeat(judgeSeat, variant), true);
  assert.equal(
    isActiveWerewolfJudgeSeat({ ...judgeSeat, leftAt: new Date() }, variant),
    false,
  );
  assert.equal(
    isActiveWerewolfJudgeSeat(
      { ...judgeSeat, guestName: null, profileId: null },
      variant,
    ),
    false,
  );
  assert.equal(
    isActiveWerewolfJudgeSeat({ ...judgeSeat, seatNumber: 1 }, variant),
    false,
  );
});
