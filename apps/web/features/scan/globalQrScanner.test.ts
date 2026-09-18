import assert from "node:assert/strict";
import test from "node:test";
import {
  getAvalonRoomCodeFromScan,
  getWerewolfRoomCodeFromScan,
  normalizeScannedRoomCode,
  resolveGlobalQrScanDestination,
  resolveGlobalQrScanResult,
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
    getWerewolfRoomCodeFromScan("friemi://game-tools/werewolf/join/c2e848"),
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
      rawValue: "https://www.friemi.com/zh-CN/game-tools/werewolf/join/c2e848",
    }),
    {
      href: "/zh-CN/game-tools/werewolf/join/C2E848",
      kind: "internal",
      source: "werewolf-room",
    },
  );
  assert.deepEqual(
    resolveGlobalQrScanDestination({
      locale: "zh-CN",
      rawValue: "friemi://game-tools/werewolf/join/c2e848",
    }),
    {
      href: "/zh-CN/game-tools/werewolf/join/C2E848",
      kind: "internal",
      source: "werewolf-room",
    },
  );
  assert.deepEqual(
    resolveGlobalQrScanDestination({
      locale: "zh-CN",
      rawValue: "friemi://lobby/activity-123",
    }),
    {
      href: "/lobby/activity-123",
      kind: "internal",
      source: "internal-link",
    },
  );
});

test("keeps coupon claim and redemption links inside Friemi", () => {
  assert.deepEqual(
    resolveGlobalQrScanDestination({
      locale: "zh-CN",
      rawValue: "https://www.friemi.com/zh-CN/coupons/claim/claim-token",
    }),
    {
      href: "/zh-CN/coupons/claim/claim-token",
      kind: "internal",
      source: "internal-link",
    },
  );
  assert.deepEqual(
    resolveGlobalQrScanDestination({
      locale: "en",
      rawValue: "/en/coupons/redeem/redemption-token",
    }),
    {
      href: "/en/coupons/redeem/redemption-token",
      kind: "internal",
      source: "internal-link",
    },
  );
});

test("resolves safe external QR actions", () => {
  assert.deepEqual(
    resolveGlobalQrScanDestination({
      locale: "zh-CN",
      rawValue: "https://example.com/menu",
    }),
    {
      href: "https://example.com/menu",
      kind: "external",
      source: "external-link",
    },
  );
  assert.deepEqual(
    resolveGlobalQrScanDestination({
      locale: "zh-CN",
      rawValue: "tel:+33123456789",
    }),
    {
      href: "tel:+33123456789",
      kind: "external",
      source: "external-link",
    },
  );
});

test("keeps unsupported QR payloads available as plain text", () => {
  assert.deepEqual(
    resolveGlobalQrScanResult({
      locale: "zh-CN",
      rawValue: "  WIFI:T:WPA;S:Friemi;P:secret;;  ",
    }),
    {
      kind: "text",
      source: "plain-text",
      value: "WIFI:T:WPA;S:Friemi;P:secret;;",
    },
  );
});

test("rejects executable URL schemes", () => {
  assert.equal(
    resolveGlobalQrScanDestination({
      locale: "zh-CN",
      rawValue: "javascript:alert(1)",
    }),
    null,
  );
});
