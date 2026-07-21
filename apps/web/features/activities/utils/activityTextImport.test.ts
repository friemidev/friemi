import assert from "node:assert/strict";
import test from "node:test";
import { parseActivityTextImport } from "./activityTextImport";

test("activity text import extracts key fields from a Chinese invite", () => {
  const result = parseActivityTextImport(
    `周五下班后桌游局
时间：8月3日 晚上7点半-10点
地点：République, Paris
人数：限8人，4人成行
费用：免费
报名链接：https://example.com/rsvp
需要审核`,
    { now: new Date("2026-07-21T10:00:00") },
  );

  assert.equal(result.draft.title, "周五下班后桌游局");
  assert.equal(result.draft.category, "BOARD_GAME");
  assert.equal(result.draft.type, "LOCAL");
  assert.equal(result.draft.city, "Paris");
  assert.equal(result.draft.address, "République, Paris");
  assert.equal(result.draft.startAt, "2026-08-03T19:30");
  assert.equal(result.draft.endAt, "2026-08-03T22:00");
  assert.equal(result.draft.capacity, "8");
  assert.equal(result.draft.capacityLimitEnabled, true);
  assert.equal(result.draft.minParticipants, "4");
  assert.equal(result.draft.priceType, "FREE");
  assert.equal(result.draft.ticketUrl, "https://example.com/rsvp");
  assert.equal(result.draft.ticketLabel, "RESERVE_SPOT");
  assert.equal(result.draft.requiresApproval, true);
});

test("activity text import resolves weekday dates from the supplied base date", () => {
  const result = parseActivityTextImport(
    `周五羽毛球
时间：周五 19:00-21:00
地点：Lyon Part-Dieu
费用：AA 10欧`,
    { now: new Date("2026-07-21T10:00:00") },
  );

  assert.equal(result.draft.category, "SPORTS");
  assert.equal(result.draft.city, "Lyon");
  assert.equal(result.draft.startAt, "2026-07-24T19:00");
  assert.equal(result.draft.endAt, "2026-07-24T21:00");
  assert.equal(result.draft.priceType, "FIXED");
  assert.equal(result.draft.priceText, "AA 10欧");
});

test("activity text import rolls yearless past month-day dates into next year", () => {
  const result = parseActivityTextImport(
    "新年咖啡局\n1月5日 19:00\n地点：Paris",
    {
      now: new Date("2026-12-20T10:00:00"),
    },
  );

  assert.equal(result.draft.category, "FOOD");
  assert.equal(result.draft.startAt, "2027-01-05T19:00");
});

test("activity text import prefers explicit activity name over nearby field labels", () => {
  const result = parseActivityTextImport(
    `活动时间：8月3日 19:00
活动名称：周五下班后桌游局
活动地点：République, Paris
费用：免费`,
    { now: new Date("2026-07-21T10:00:00") },
  );

  assert.equal(result.draft.title, "周五下班后桌游局");
  assert.equal(result.draft.address, "République, Paris");
  assert.equal(result.draft.startAt, "2026-08-03T19:00");
});

test("activity text import extracts a concise title from conversational copy", () => {
  const result = parseActivityTextImport(
    `大家好～这周想约一个周六卢浮宫看展局
时间：周六 14:00-16:00
地点：Musée du Louvre, Paris
人数：4人成行，最多8人
费用：门票自理`,
    { now: new Date("2026-07-21T10:00:00") },
  );

  assert.equal(result.draft.title, "周六卢浮宫看展局");
  assert.equal(result.draft.category, "ART");
  assert.equal(result.draft.capacity, "8");
  assert.equal(result.draft.minParticipants, "4");
  assert.equal(result.draft.priceType, "FIXED");
  assert.equal(result.draft.priceText, "门票自理");
  assert.equal(result.draft.startAt, "2026-07-25T14:00");
  assert.equal(result.draft.endAt, "2026-07-25T16:00");
});

test("activity text import handles compact one-line poster copy", () => {
  const result = parseActivityTextImport(
    "【周五爵士live】7/24 20:00 @ Sunset Sunside, Paris 费用: 15€",
    { now: new Date("2026-07-21T10:00:00") },
  );

  assert.equal(result.draft.title, "周五爵士live");
  assert.equal(result.draft.category, "MUSIC");
  assert.equal(result.draft.address, "Sunset Sunside, Paris");
  assert.equal(result.draft.startAt, "2026-07-24T20:00");
  assert.equal(result.draft.priceType, "FIXED");
  assert.equal(result.draft.priceText, "15€");
});
