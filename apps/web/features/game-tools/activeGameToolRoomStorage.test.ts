import assert from "node:assert/strict";
import test from "node:test";
import { canUseStoredActiveGameToolRoom, parseStoredActiveGameToolRoom, type StoredActiveGameToolRoom } from "./activeGameToolRoomStorage";

const drawGuessRoom: StoredActiveGameToolRoom = {
  code: "ABC123", href: "/en/game-tools/draw-guess/rooms/room-a", id: "room-a", kind: "DRAW_GUESS", locale: "en",
  privateSeatHref: null, profileId: "player-a", seatNumber: 1, title: "Draw & Guess",
};

test("Draw & Guess stored shortcuts are visible only to the profile that saved them", () => {
  const raw = JSON.stringify(drawGuessRoom);
  assert.deepEqual(parseStoredActiveGameToolRoom(raw, "en", "player-a"), drawGuessRoom);
  for (const profileId of ["player-b", null, undefined]) {
    assert.equal(parseStoredActiveGameToolRoom(raw, "en", profileId), null);
    // A profile change must also hide an already loaded record before effects rerun.
    assert.equal(canUseStoredActiveGameToolRoom(drawGuessRoom, profileId), false);
  }
  assert.equal(parseStoredActiveGameToolRoom(raw, "fr", "player-a"), null);
});

test("legacy Draw & Guess records with no known owner cannot be adopted by a new account", () => {
  const { profileId: _owner, ...legacy } = drawGuessRoom;
  for (const profileId of ["player-a", "player-b", null]) {
    assert.equal(parseStoredActiveGameToolRoom(JSON.stringify(legacy), "en", profileId), null);
  }
});

test("dice room shortcut belongs to the signed-in player", () => {
  const diceRoom = { ...drawGuessRoom, kind: "DICE" as const, href: "/en/game-tools/dice/online/rooms/room-a" };
  assert.deepEqual(parseStoredActiveGameToolRoom(JSON.stringify(diceRoom), "en", "player-a"), diceRoom);
  assert.equal(parseStoredActiveGameToolRoom(JSON.stringify(diceRoom), "en", "player-b"), null);
});

test("other games retain legacy shortcut support, including private Werewolf seats", () => {
  const { profileId: _owner, ...legacy } = drawGuessRoom;
  for (const kind of ["AVALON", "STORYTELLER", "WEREWOLF"] as const) {
    const room = { ...legacy, kind, privateSeatHref: kind === "WEREWOLF" ? "/en/game-tools/werewolf/seats/private-token" : null };
    assert.deepEqual(parseStoredActiveGameToolRoom(JSON.stringify(room), "en"), room);
  }
});


test("UNO shortcuts cannot cross accounts or recover ownerless cached records", () => {
  const room: StoredActiveGameToolRoom = { ...drawGuessRoom, kind: "UNO", title: "UNO", href: "/en/game-tools/uno/rooms/room-a" };
  assert.deepEqual(parseStoredActiveGameToolRoom(JSON.stringify(room), "en", "player-a"), room);
  const { profileId: _owner, ...legacy } = room;
  for (const profileId of ["player-a", "player-b", null, undefined]) {
    if (profileId !== "player-a") {
      assert.equal(parseStoredActiveGameToolRoom(JSON.stringify(room), "en", profileId), null);
      assert.equal(canUseStoredActiveGameToolRoom(room, profileId), false);
    }
    assert.equal(parseStoredActiveGameToolRoom(JSON.stringify(legacy), "en", profileId), null);
  }
});
