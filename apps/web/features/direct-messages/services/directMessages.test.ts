import assert from "node:assert/strict";
import test from "node:test";
import {
  nonFriendDirectMessageLimit,
  resolveDirectMessageSendPolicy,
} from "./directMessages";

test("direct message policy allows friends without non-friend limits", () => {
  const policy = resolveDirectMessageSendPolicy({
    currentUserProfileId: "u1",
    isFriend: true,
    peerProfileId: "u2",
    trustScore: 30,
  });

  assert.equal(policy.canSend, true);
  assert.equal(policy.isFriend, true);
  assert.equal(policy.remainingNonFriendMessages, null);
});

test("direct message policy blocks self and low-trust senders", () => {
  assert.equal(
    resolveDirectMessageSendPolicy({
      currentUserProfileId: "u1",
      peerProfileId: "u1",
    }).reason,
    "SELF_CONVERSATION",
  );
  assert.equal(
    resolveDirectMessageSendPolicy({
      currentUserProfileId: "u1",
      hasOrganizerActivity: true,
      peerProfileId: "u2",
      trustScore: 59,
    }).reason,
    "LOW_TRUST",
  );
});

test("direct message policy lets non-friends start with a two-message limit", () => {
  const policy = resolveDirectMessageSendPolicy({
    currentUserProfileId: "u1",
    peerProfileId: "u2",
    trustScore: 80,
  });

  assert.equal(policy.canSend, true);
  assert.equal(policy.reason, "ALLOWED");
  assert.equal(
    policy.remainingNonFriendMessages,
    nonFriendDirectMessageLimit,
  );
});

test("direct message policy enforces two non-friend messages until peer replies", () => {
  assert.equal(nonFriendDirectMessageLimit, 2);

  const secondAllowed = resolveDirectMessageSendPolicy({
    conversationId: "c1",
    currentUserMessageCount: 1,
    currentUserProfileId: "u1",
    peerProfileId: "u2",
    trustScore: 80,
  });

  assert.equal(secondAllowed.canSend, true);
  assert.equal(secondAllowed.remainingNonFriendMessages, 1);

  const thirdBlocked = resolveDirectMessageSendPolicy({
    conversationId: "c1",
    currentUserMessageCount: 2,
    currentUserProfileId: "u1",
    peerProfileId: "u2",
    trustScore: 80,
  });

  assert.equal(thirdBlocked.canSend, false);
  assert.equal(thirdBlocked.reason, "NON_FRIEND_LIMIT_REACHED");
  assert.equal(thirdBlocked.remainingNonFriendMessages, 0);

  const unlocked = resolveDirectMessageSendPolicy({
    conversationId: "c1",
    currentUserMessageCount: 8,
    currentUserProfileId: "u1",
    hasPeerReplied: true,
    peerProfileId: "u2",
    trustScore: 80,
  });

  assert.equal(unlocked.canSend, true);
  assert.equal(unlocked.remainingNonFriendMessages, null);
});
