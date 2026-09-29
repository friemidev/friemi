import assert from "node:assert/strict";
import test from "node:test";
import {
  getWerewolfAppJoinUrl,
  getWerewolfPrivateSeatHref,
  getWerewolfWebJoinPath,
} from "./werewolfRoomLinks";

test("builds a custom-scheme Werewolf join URL for QR codes", () => {
  assert.equal(
    getWerewolfAppJoinUrl(" 47a9e6 "),
    "friemi://game-tools/werewolf/join/47A9E6",
  );
});

test("builds the matching web fallback path", () => {
  assert.equal(
    getWerewolfWebJoinPath("47a9e6"),
    "/game-tools/werewolf/join/47A9E6",
  );
});

test("keys private seat navigation by round to avoid stale role data", () => {
  assert.equal(
    getWerewolfPrivateSeatHref({
      locale: "zh-CN",
      privateToken: "private-token",
      roundNumber: 2,
    }),
    "/zh-CN/game-tools/werewolf/seats/private-token?round=2",
  );
});
