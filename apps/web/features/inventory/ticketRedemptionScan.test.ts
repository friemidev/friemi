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

test("rejects friend codes, coupon links and arbitrary URLs", () => {
  assert.equal(parseTicketRedemptionToken("123456"), null);
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
