import assert from "node:assert/strict";
import test from "node:test";
import {
  getWerewolfAtmosphereIdFromRoomConfig,
  werewolfAtmospheres,
} from "./werewolfCardAssets";

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
