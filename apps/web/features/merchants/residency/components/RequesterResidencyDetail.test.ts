import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ResidencySlotDetail } from "../queries";
import { RequesterResidencyDetail } from "./RequesterResidencyDetail";

const slot: ResidencySlotDetail = {
  id: "slot-1",
  date: "2050-07-20",
  title: "Store gathering",
  description: "A gathering at the store",
  status: "CONFIRMED",
  signupCount: 1,
  viewerSignedUp: false,
  viewerHadSignup: false,
  viewerRequested: true,
  activityId: null,
  activity: null,
  merchant: {
    id: "merchant-1",
    name: "Old merchant",
    slug: "store",
    city: "Paris",
    address: "Paris",
    logoUrl: null,
  },
  reviewedAt: null,
  rejectionReason: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  signups: [
    {
      id: "signup-1",
      profileId: "attendee-1",
      nickname: "Private attendee",
      status: "ACTIVE",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      cancelledAt: null,
    },
  ],
};

test("former applicants see only a read-only request, without attendee identities", () => {
  const html = renderToStaticMarkup(
    createElement(RequesterResidencyDetail, { locale: "en", slot }),
  );
  assert.match(html, /Store gathering/);
  assert.match(html, /Old merchant/);
  assert.match(html, /href="\/en\/profile"/);
  assert.doesNotMatch(html, /Private attendee/);
  assert.doesNotMatch(html, /\/publish/);
  assert.doesNotMatch(html, /Cancel this date/);
});
