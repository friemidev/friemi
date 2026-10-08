import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTicketRedemptionToken } from "./ticketRedemptionScan";

const token = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde";

test("accepts a temporary ticket token or check-in link", () => {
  assert.equal(token.length, 43);
  assert.equal(parseTicketRedemptionToken(token), token);
  assert.equal(
    parseTicketRedemptionToken(
      `https://friemi.app/zh-CN/tickets/redeem/${token}`,
    ),
    token,
  );
  assert.equal(
    parseTicketRedemptionToken(`/en/tickets/redeem/${token}`),
    token,
  );
});

test("accepts a six-digit check-in code, including grouped input", () => {
  assert.equal(parseTicketRedemptionToken("123456"), "123456");
  assert.equal(parseTicketRedemptionToken("123 456"), "123456");
  assert.equal(parseTicketRedemptionToken("123-456"), "123456");
  assert.equal(
    parseTicketRedemptionToken("https://friemi.app/fr/tickets/redeem/123456"),
    "123456",
  );
});

test("accepts a legacy ten-digit code only as a ten-digit credential", () => {
  assert.equal(parseTicketRedemptionToken("12345 67890"), "1234567890");
  assert.equal(
    parseTicketRedemptionToken(
      "https://friemi.app/en/tickets/redeem/1234567890",
    ),
    "1234567890",
  );
});

test("rejects other numbers, coupon links and arbitrary URLs", () => {
  assert.equal(parseTicketRedemptionToken("1234567"), null);
  assert.equal(
    parseTicketRedemptionToken(`https://friemi.app/en/coupons/redeem/${token}`),
    null,
  );
  assert.equal(parseTicketRedemptionToken(`javascript:${token}`), null);
  assert.equal(
    parseTicketRedemptionToken(`//malicious.example/${token}`),
    null,
  );
});
