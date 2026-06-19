import test from "node:test";
import assert from "node:assert/strict";
import {
  getActivityWeatherWidgetInput,
  isWeatherDateInForecastWindow,
} from "./activityWeather";

const now = new Date("2026-06-17T10:00:00.000Z");

test("shows weather for a single-day activity within the next seven days", () => {
  const input = getActivityWeatherWidgetInput(
    {
      address: "14 rue de Madrid",
      city: "Paris",
      endAt: "2026-06-20T18:00:00.000Z",
      latitude: 48.879,
      longitude: 2.326,
      startAt: "2026-06-20T11:30:00.000Z",
    },
    now,
  );

  assert.deepEqual(input, {
    date: "2026-06-20",
    latitude: 48.879,
    locationQuery: "14 rue de Madrid, Paris",
    longitude: 2.326,
  });
});

test("does not show weather for multi-day activities", () => {
  const input = getActivityWeatherWidgetInput(
    {
      address: "Paris",
      city: "Paris",
      endAt: "2026-06-25T18:00:00.000Z",
      latitude: 48.8566,
      longitude: 2.3522,
      startAt: "2026-06-20T11:30:00.000Z",
    },
    now,
  );

  assert.equal(input, null);
});

test("does not show weather outside the forecast window", () => {
  const input = getActivityWeatherWidgetInput(
    {
      address: "Paris",
      city: "Paris",
      latitude: 48.8566,
      longitude: 2.3522,
      startAt: "2026-06-30T11:30:00.000Z",
    },
    now,
  );

  assert.equal(input, null);
});

test("allows city fallback when coordinates are missing", () => {
  const input = getActivityWeatherWidgetInput(
    {
      address: null,
      city: "Paris",
      latitude: null,
      longitude: null,
      startAt: "2026-06-19T11:30:00.000Z",
    },
    now,
  );

  assert.equal(input?.locationQuery, "Paris");
  assert.equal(input?.latitude, null);
  assert.equal(input?.longitude, null);
});

test("validates weather API forecast date window", () => {
  assert.equal(isWeatherDateInForecastWindow("2026-06-17", now), true);
  assert.equal(isWeatherDateInForecastWindow("2026-06-24", now), true);
  assert.equal(isWeatherDateInForecastWindow("2026-06-25", now), false);
  assert.equal(isWeatherDateInForecastWindow("not-a-date", now), false);
});
