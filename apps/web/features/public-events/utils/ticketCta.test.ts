import assert from "node:assert/strict";
import test from "node:test";
import {
  getStoredTicketLabel,
  getTicketCtaLabel,
  isUsableTicketLabel,
} from "./ticketCta";

test("getTicketCtaLabel localizes generic Open Data labels", () => {
  assert.equal(getTicketCtaLabel("zh-CN", "Réservation"), "立即抢票");
  assert.equal(getTicketCtaLabel("en", "Réservation"), "Get tickets");
  assert.equal(getTicketCtaLabel("fr", "Réservation"), "Réserver");
});

test("getTicketCtaLabel localizes generic detail labels", () => {
  assert.equal(getTicketCtaLabel("zh-CN", "En savoir plus"), "了解详情");
  assert.equal(getTicketCtaLabel("en", "En savoir plus"), "Learn more");
  assert.equal(getTicketCtaLabel("fr", "En savoir plus"), "En savoir plus");
});

test("getTicketCtaLabel rejects URL-like labels", () => {
  const longUrl =
    "https://www.example.com/events/very-long-ticket-url-that-should-never-be-used-as-a-button-label";

  assert.equal(isUsableTicketLabel(longUrl), false);
  assert.equal(getTicketCtaLabel("zh-CN", longUrl), "立即抢票");
});

test("getTicketCtaLabel keeps specific custom labels", () => {
  assert.equal(getTicketCtaLabel("zh-CN", "学生票"), "学生票");
});

test("getStoredTicketLabel stores only specific labels", () => {
  assert.equal(getStoredTicketLabel("Réservation"), null);
  assert.equal(getStoredTicketLabel("En savoir plus"), null);
  assert.equal(getStoredTicketLabel("https://example.com/tickets"), null);
  assert.equal(getStoredTicketLabel("学生票"), "学生票");
});
