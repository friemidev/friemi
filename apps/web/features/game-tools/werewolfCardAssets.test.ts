import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { werewolfRoleKeys } from "./werewolfConfig";
import {
  getWerewolfAtmosphereIdFromRoomConfig,
  getWerewolfRoleCardImage,
  werewolfAtmospheres,
} from "./werewolfCardAssets";

test("every Werewolf role has an English-named card face", () => {
  for (const role of werewolfRoleKeys) {
    const image = getWerewolfRoleCardImage(role, "zh-CN");
    assert.ok(image?.endsWith("_en.png"));
    assert.ok(existsSync(new URL(`../../public${image}`, import.meta.url)), role);
  }

  const femaleVillagerImage = getWerewolfRoleCardImage("villager", "en", 2);
  assert.equal(
    femaleVillagerImage,
    "/game-tools/werewolf/recto/villager_female_en.png",
  );
  assert.ok(
    existsSync(new URL(`../../public${femaleVillagerImage}`, import.meta.url)),
  );
  assert.equal(
    getWerewolfRoleCardImage("villager", "fr", 1),
    "/game-tools/werewolf/recto/villager_en.png",
  );
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
