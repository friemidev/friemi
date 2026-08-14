import assert from "node:assert/strict";
import test from "node:test";
import {
  getAvalonRoomCodeFromScan,
  getWerewolfRoomCodeFromScan,
  normalizeScannedRoomCode,
  resolveGlobalQrScanDestination,
} from "./globalQrScanner";

test("normalizes manually entered game room codes", () => {
  assert.equal(normalizeScannedRoomCode(" c2 e-848 "), "C2E848");
  assert.equal(getWerewolfRoomCodeFromScan(" c2 e-848 "), "C2E848");
});

test("extracts game room codes from Friemi invite links", () => {
  assert.equal(
    getWerewolfRoomCodeFromScan(
      "https://www.friemi.com/zh-CN/game-tools/werewolf/join/c2e848?from=qr",
    ),
    "C2E848",
  );
  assert.equal(
    getWerewolfRoomCodeFromScan(
      "friemi.com/zh-CN/game-tools/werewolf/join/c2e848",
    ),
    "C2E848",
  );
  assert.equal(
    getAvalonRoomCodeFromScan("/en/game-tools/avalon/join/ab-1234"),
    "AB1234",
  );
});

test("does not convert arbitrary links into game room codes", () => {
  assert.equal(
    getWerewolfRoomCodeFromScan(
      "https://example.com/zh-CN/game-tools/werewolf/join/c2e848",
    ),
    "",
  );
  assert.equal(getWerewolfRoomCodeFromScan("/not-a-room/c2e848"), "");
});

test("resolves Friemi full links as internal scan destinations", () => {
  assert.deepEqual(
    resolveGlobalQrScanDestination({
      locale: "zh-CN",
      rawValue:
        "https://www.friemi.com/zh-CN/game-tools/werewolf/join/c2e848",
    }),
    {
      href: "/zh-CN/game-tools/werewolf/join/C2E848",
      kind: "internal",
      source: "werewolf-room",
    },
  );
});
