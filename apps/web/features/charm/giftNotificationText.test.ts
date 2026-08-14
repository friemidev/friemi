import assert from "node:assert/strict";
import test from "node:test";
import {
  formatGiftNotificationQuantity,
  formatGiftNotificationText,
} from "./giftNotificationText";

test("gift notifications display the sent quantity instead of charm delta", () => {
  assert.equal(
    formatGiftNotificationText({
      giftEmoji: "🌹",
      giftLabel: "玫瑰",
      quantity: 5,
    }),
    "🌹 玫瑰 ×5",
  );
});

test("gift notification quantities keep a safe one-to-99 range", () => {
  assert.equal(formatGiftNotificationQuantity(undefined), "×1");
  assert.equal(formatGiftNotificationQuantity(0), "×1");
  assert.equal(formatGiftNotificationQuantity(120), "×99");
});
