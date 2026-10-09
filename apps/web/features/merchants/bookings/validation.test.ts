import assert from "node:assert/strict";
import test from "node:test";
import {
  getBookingToday,
  isBookingDateOpen,
  normalizeBookingPhone,
  parseBookingDate,
  validateBookingSettings,
  type BookingSettingsInput,
} from "./validation";

const base: BookingSettingsInput = {
  actorProfileId: "owner",
  enabled: true,
  scheduleMode: "DAILY",
  startDate: "2050-06-01",
  endDate: null,
  weekdays: [],
  specificDates: [],
  closedDates: [],
  title: "Permanent meetup",
  description: "Book a visit",
};

test("availability supports daily, weekly and specific dates within exclusions and bounds", () => {
  assert.equal(isBookingDateOpen(base, "2050-06-03", "2050-06-01"), true);
  assert.equal(
    isBookingDateOpen({ ...base, enabled: false }, "2050-06-03", "2050-06-01"),
    false,
  );
  assert.equal(
    isBookingDateOpen(
      { ...base, endDate: "2050-06-02" },
      "2050-06-03",
      "2050-06-01",
    ),
    false,
  );
  assert.equal(
    isBookingDateOpen(
      { ...base, closedDates: ["2050-06-03"] },
      "2050-06-03",
      "2050-06-01",
    ),
    false,
  );
  const day = parseBookingDate("2050-06-03")!.getUTCDay();
  assert.equal(
    isBookingDateOpen(
      { ...base, scheduleMode: "WEEKLY", weekdays: [day] },
      "2050-06-03",
      "2050-06-01",
    ),
    true,
  );
  assert.equal(
    isBookingDateOpen(
      { ...base, scheduleMode: "WEEKLY", weekdays: [(day + 1) % 7] },
      "2050-06-03",
      "2050-06-01",
    ),
    false,
  );
  assert.equal(
    isBookingDateOpen(
      { ...base, scheduleMode: "DATES", specificDates: ["2050-06-03"] },
      "2050-06-03",
      "2050-06-01",
    ),
    true,
  );
  assert.equal(
    isBookingDateOpen(
      { ...base, scheduleMode: "DATES", specificDates: ["2050-06-03"] },
      "2050-06-04",
      "2050-06-01",
    ),
    false,
  );
});

test("dates reject rollover values and compare using Paris calendar days", () => {
  assert.equal(parseBookingDate("2050-02-30"), null);
  assert.equal(parseBookingDate("50-06-01"), null);
  assert.equal(getBookingToday(new Date("2050-06-01T22:30:00Z")), "2050-06-02");
  assert.equal(isBookingDateOpen(base, "2050-06-01", "2050-06-02"), false);
});

test("phone validation keeps international prefixes and rejects blank or arbitrary strings", () => {
  assert.equal(normalizeBookingPhone("+33 (0)6 12 34 56 78"), "+330612345678");
  assert.equal(normalizeBookingPhone("06 12 34 56 78"), "0612345678");
  for (const value of [
    "",
    "hello",
    "123",
    "+33+666666",
    "1234567890123456",
    "123456@example.com",
  ])
    assert.equal(normalizeBookingPhone(value), null);
});

test("settings need a usable rule and reject unsafe cover URLs", () => {
  assert.equal(validateBookingSettings(base), true);
  assert.equal(
    validateBookingSettings({ ...base, scheduleMode: "WEEKLY" }),
    false,
  );
  assert.equal(
    validateBookingSettings({ ...base, scheduleMode: "DATES" }),
    false,
  );
  assert.equal(
    validateBookingSettings({ ...base, endDate: "2050-05-31" }),
    false,
  );
  assert.equal(validateBookingSettings({ ...base, weekdays: [7] }), false);
  assert.equal(
    validateBookingSettings({ ...base, coverImageUrl: "javascript:alert(1)" }),
    false,
  );
});
