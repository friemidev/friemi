import assert from "node:assert/strict";
import test from "node:test";
import {
  getViewerBookingState,
  isUpcomingViewerBooking,
  type ViewerBooking,
} from "./viewerQueries";

const booking: ViewerBooking = {
  id: "signup-1",
  slotId: "slot-1",
  date: "2050-07-20",
  title: "Meetup",
  merchant: { id: "merchant-1", name: "Store", isActive: true },
  activityId: null,
  state: "CONFIRMED",
};

test("a confirmed future signup stays in upcoming until publication", () => {
  assert.equal(isUpcomingViewerBooking(booking, "2050-07-19"), true);
  assert.equal(
    getViewerBookingState({
      activityStatus: null,
      participationStatus: null,
      signupStatus: "ACTIVE",
      slotStatus: "CONFIRMED",
    }),
    "CONFIRMED",
  );
});

test("activity cancellation and participant withdrawal become history", () => {
  const cancelled = getViewerBookingState({
    activityStatus: "CANCELLED",
    participationStatus: "APPROVED",
    signupStatus: "ACTIVE",
    slotStatus: "PUBLISHED",
  });
  const withdrawn = getViewerBookingState({
    activityStatus: "RECRUITING",
    participationStatus: "CANCELLED",
    signupStatus: "ACTIVE",
    slotStatus: "PUBLISHED",
  });
  assert.equal(cancelled, "BOOKING_CANCELLED");
  assert.equal(withdrawn, "SIGNUP_CANCELLED");
  assert.equal(
    isUpcomingViewerBooking({ ...booking, state: cancelled }),
    false,
  );
  assert.equal(
    isUpcomingViewerBooking({ ...booking, state: withdrawn }),
    false,
  );
});

test("a past booking stays in history even if it was published", () => {
  assert.equal(
    isUpcomingViewerBooking({ ...booking, state: "PUBLISHED" }, "2050-07-21"),
    false,
  );
});
