import assert from "node:assert/strict";
import test from "node:test";
import { createActivitySchema } from "./activitySchema";

test("activity schema accepts local illustration cover paths", () => {
  const result = createActivitySchema.safeParse({
    address: "Republique, Paris",
    capacity: 0,
    capacityLimitEnabled: false,
    category: "ART",
    city: "Paris",
    coverImageUrl: "/illustrations/png/art.png",
    description: "Simple art meetup.",
    destination: "",
    endAt: "",
    hideAddressFromNonParticipants: false,
    itinerary: "",
    otherCategoryText: "",
    priceText: "",
    priceType: "FREE",
    requiresApproval: false,
    startAt: "2026-08-01T19:00",
    title: "Art meetup",
    type: "LOCAL",
    visibility: "PUBLIC",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(result.data.coverImageUrl, "/illustrations/png/art.png");
  }
});

test("activity schema accepts the default Friemi cover path", () => {
  const result = createActivitySchema.safeParse({
    address: "Republique, Paris",
    capacity: 0,
    capacityLimitEnabled: false,
    category: "OTHER",
    city: "Paris",
    coverImageUrl: "/brand/v2_1/friemi-icon-square-1024.png",
    description: "Simple meetup.",
    destination: "",
    endAt: "",
    hideAddressFromNonParticipants: false,
    itinerary: "",
    otherCategoryText: "Meetup",
    priceText: "",
    priceType: "FREE",
    requiresApproval: false,
    startAt: "2026-08-01T19:00",
    title: "Meetup",
    type: "LOCAL",
    visibility: "PUBLIC",
  });

  assert.equal(result.success, true);

  if (result.success) {
    assert.equal(
      result.data.coverImageUrl,
      "/brand/v2_1/friemi-icon-square-1024.png",
    );
  }
});

test("host links accept the new purposes and reject unsafe URL schemes", () => {
  const base = {
    address: "Paris",
    coverImageUrl: "",
    itinerary: "",
    destination: "",
    endAt: "",
    otherCategoryText: "",
    capacity: 20,
    category: "SPORTS",
    city: "Paris",
    description: "A local meetup",
    priceText: "",
    priceType: "FREE",
    startAt: "2026-11-21T13:00",
    title: "Ping Pong",
    type: "LOCAL",
    visibility: "PUBLIC",
  };
  for (const ticketLabel of [
    "SUPPLEMENTARY_FORM",
    "VIEW_DETAILS",
    "RESERVE_SPOT",
    "HOST_LINK",
    "学生票",
  ]) {
    assert.equal(
      createActivitySchema.safeParse({
        ...base,
        ticketLabel,
        ticketUrl: "https://docs.google.com/forms/d/e/example/viewform",
      }).success,
      true,
    );
  }
  for (const ticketUrl of [
    "http://example.com",
    "https://user:password@example.com",
    "javascript:alert(1)",
    "https://",
  ]) {
    assert.equal(
      createActivitySchema.safeParse({
        ...base,
        ticketUrl,
        ticketLabel: "HOST_LINK",
      }).success,
      false,
    );
  }
});
