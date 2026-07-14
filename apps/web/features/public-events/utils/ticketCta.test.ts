import assert from "node:assert/strict";
import test from "node:test";
import {
  getStoredTicketLabel,
  getTicketCtaLabel,
  isUsableTicketLabel,
} from "./ticketCta";

test("getTicketCtaLabel localizes generic Open Data labels", () => {
  assert.equal(getTicketCtaLabel("zh-CN", "Réservation"), "抢位置");
  assert.equal(getTicketCtaLabel("en", "Réservation"), "Save a spot");
  assert.equal(getTicketCtaLabel("fr", "Réservation"), "Réserver une place");
});

test("getTicketCtaLabel localizes generic detail labels", () => {
  assert.equal(getTicketCtaLabel("zh-CN", "En savoir plus"), "查看详情");
  assert.equal(getTicketCtaLabel("en", "En savoir plus"), "View details");
  assert.equal(getTicketCtaLabel("fr", "En savoir plus"), "Voir les détails");
});

test("getTicketCtaLabel localizes semantic activity link labels", () => {
  assert.equal(getTicketCtaLabel("zh-CN", "RESERVE_SPOT"), "抢位置");
  assert.equal(getTicketCtaLabel("en", "RESERVE_SPOT"), "Save a spot");
  assert.equal(
    getTicketCtaLabel("fr", "RESERVE_SPOT"),
    "Réserver une place",
  );
  assert.equal(getTicketCtaLabel("zh-CN", "VIEW_DETAILS"), "查看详情");
  assert.equal(getTicketCtaLabel("en", "VIEW_DETAILS"), "View details");
  assert.equal(getTicketCtaLabel("fr", "VIEW_DETAILS"), "Voir les détails");
});

test("getTicketCtaLabel rejects URL-like labels", () => {
  const longUrl =
    "https://www.example.com/events/very-long-ticket-url-that-should-never-be-used-as-a-button-label";

  assert.equal(isUsableTicketLabel(longUrl), false);
  assert.equal(getTicketCtaLabel("zh-CN", longUrl), "抢位置");
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
