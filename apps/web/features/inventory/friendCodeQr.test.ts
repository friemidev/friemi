import assert from "node:assert/strict";
import test from "node:test";
import { extractFriemiCodeFromQrValue } from "./friendCodeQr";
import { normalizeFriemiCode } from "./friemiCode";

const origin = "https://www.friemi.com";

test("accepts the existing Friemi friend QR and a manually entered code", () => {
  assert.equal(
    extractFriemiCodeFromQrValue(
      `${origin}/zh-CN/friends?friendCode=001234`,
      origin,
    ),
    "001234",
  );
  assert.equal(normalizeFriemiCode("００１-２３４"), "001234");
});

test("rejects another site's QR even when it contains a Friemi code", () => {
  assert.equal(
    extractFriemiCodeFromQrValue(
      "https://example.com/zh-CN/friends?friendCode=001234",
      origin,
    ),
    null,
  );
  assert.equal(
    extractFriemiCodeFromQrValue(
      `${origin}/zh-CN/activities?friendCode=001234`,
      origin,
    ),
    null,
  );
});
