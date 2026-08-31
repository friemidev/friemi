import assert from "node:assert/strict";
import test from "node:test";
import type { ActivityCardViewModel } from "../types";
import {
  applyPrivateActivityCardAccess,
  canAccessPrivateActivityCard,
  isPrivateActivityCardLocked,
} from "./privateActivityCardAccess";

const privateCard = {
  address: "10 Private Street",
  city: "Paris",
  contactableParticipants: [{ avatarUrl: null, id: "p1", nickname: "N" }],
  description: "Private details",
  friendSignal: { allFriends: [], count: 1, extraCount: 0, previewFriends: [] },
  latitude: 48.8,
  longitude: 2.3,
  organizerId: "host-1",
  participantPreview: [{ avatarUrl: null, id: "p1", nickname: "N" }],
  visibility: "PRIVATE",
} as unknown as ActivityCardViewModel;

test("private activity cards unlock for the organizer, mutual friends, and participants", () => {
  assert.equal(
    canAccessPrivateActivityCard(privateCard, {
      friendIds: [],
      viewerParticipationStatus: null,
      viewerProfileId: "host-1",
    }),
    true,
  );
  assert.equal(
    canAccessPrivateActivityCard(privateCard, {
      friendIds: ["host-1"],
      viewerParticipationStatus: null,
      viewerProfileId: "viewer-1",
    }),
    true,
  );
  assert.equal(
    canAccessPrivateActivityCard(privateCard, {
      friendIds: [],
      viewerParticipationStatus: "APPROVED",
      viewerProfileId: "viewer-1",
    }),
    true,
  );
});

test("locked private cards expose only their public summary", () => {
  const lockedCard = applyPrivateActivityCardAccess(privateCard, false);

  assert.equal(isPrivateActivityCardLocked(lockedCard), true);
  assert.equal(lockedCard.address, "Paris");
  assert.equal(lockedCard.description, "");
  assert.equal(lockedCard.latitude, null);
  assert.deepEqual(lockedCard.participantPreview, []);
  assert.deepEqual(lockedCard.contactableParticipants, []);
});
