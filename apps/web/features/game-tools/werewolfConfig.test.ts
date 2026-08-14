import assert from "node:assert/strict";
import test from "node:test";
import {
  getWerewolfRoleLabel,
  werewolfRoleKeys,
  werewolfRoleLabels,
  type WerewolfRoleLocale,
} from "./werewolfConfig";

test("defines every Werewolf role in Chinese, English, and French", () => {
  const locales: WerewolfRoleLocale[] = ["zh-CN", "en", "fr"];

  locales.forEach((locale) => {
    werewolfRoleKeys.forEach((roleKey) => {
      assert.equal(
        getWerewolfRoleLabel(locale, roleKey),
        werewolfRoleLabels[locale][roleKey],
      );
      assert.ok(werewolfRoleLabels[locale][roleKey].length > 0);
    });
  });
});

test("keeps the Chinese Werewolf role labels explicit", () => {
  assert.deepEqual(werewolfRoleLabels["zh-CN"], {
    hunter: "猎人",
    idiot: "白痴",
    seer: "预言家",
    villager: "平民",
    werewolf: "狼人",
    witch: "女巫",
  });
});
