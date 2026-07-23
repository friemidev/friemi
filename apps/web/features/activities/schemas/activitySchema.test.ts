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
