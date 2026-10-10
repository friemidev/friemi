import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import test from "node:test";
import { werewolfRoleKeys } from "./werewolfConfig";
import {
  getWerewolfAtmosphereIdFromRoomConfig,
  getWerewolfRoleCardImage,
  werewolfAtmospheres,
} from "./werewolfCardAssets";

test("every active role has a localized card face", () => {
  for (const role of werewolfRoleKeys) {
    for (const locale of ["zh-CN", "en", "fr"]) {
      const image = getWerewolfRoleCardImage(role, locale);
      const language = locale === "zh-CN" ? "chinese" : "english";
      assert.equal(
        image,
        `/game-tools/werewolf/recto/${language}/${role}.png`,
      );
      assert.ok(
        existsSync(new URL(`../../public${image}`, import.meta.url)),
        image ?? role,
      );
    }
  }

  for (const locale of ["zh-CN", "en", "fr"]) {
    const language = locale === "zh-CN" ? "chinese" : "english";
    const femaleVillagerImage = getWerewolfRoleCardImage(
      "villager",
      locale,
      2,
    );
    assert.equal(
      femaleVillagerImage,
      `/game-tools/werewolf/recto/${language}/villager_female.png`,
    );
    assert.ok(
      existsSync(new URL(`../../public${femaleVillagerImage}`, import.meta.url)),
    );
  }
  assert.equal(
    getWerewolfRoleCardImage("villager", "fr", 1),
    "/game-tools/werewolf/recto/english/villager.png",
  );
  assert.equal(
    getWerewolfRoleCardImage("lovers", "zh-CN"),
    "/game-tools/werewolf/recto/chinese/villager.png",
  );
});

test("every localized card face belongs to an available role", () => {
  const expectedFiles = [...werewolfRoleKeys, "villager_female"]
    .map((role) => `${role}.png`)
    .sort();

  for (const language of ["chinese", "english"]) {
    const files = readdirSync(
      new URL(
        `../../public/game-tools/werewolf/recto/${language}/`,
        import.meta.url,
      ),
    )
      .filter((file) => file.endsWith(".png"))
      .sort();

    assert.deepEqual(files, expectedFiles, language);
  }
});

test("keeps the atmosphere selected when a Werewolf room is created", () => {
  assert.equal(
    getWerewolfAtmosphereIdFromRoomConfig(
      { atmosphereId: "star-altar" },
      "room-a",
    ),
    "star-altar",
  );
});

test("gives legacy Werewolf rooms a stable atmosphere fallback", () => {
  const first = getWerewolfAtmosphereIdFromRoomConfig({}, "legacy-room");
  const second = getWerewolfAtmosphereIdFromRoomConfig({}, "legacy-room");

  assert.equal(first, second);
  assert.ok(werewolfAtmospheres.some((atmosphere) => atmosphere.id === first));
});
