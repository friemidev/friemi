import assert from "node:assert/strict";
import test from "node:test";
import {
  getWerewolfPlayerJudgeLabel,
  getWerewolfRoleCopy,
  getWerewolfRoleLabel,
  getWerewolfVariantLabel,
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
