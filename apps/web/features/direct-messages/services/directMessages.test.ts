import assert from "node:assert/strict";
import test from "node:test";
import {
  nonFriendDirectMessageLimit,
  resolveDirectMessageSendPolicy,
} from "./directMessages";

test("direct message policy allows mutual follows without non-mutual limits", () => {
  const policy = resolveDirectMessageSendPolicy({
    currentUserProfileId: "u1",
    isMutualFollow: true,
    peerProfileId: "u2",
    trustScore: 30,
  });

  assert.equal(policy.canSend, true);
  assert.equal(policy.isMutualFollow, true);
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

test("direct message policy lets non-mutual users start with one message", () => {
  const policy = resolveDirectMessageSendPolicy({
    currentUserProfileId: "u1",
    peerProfileId: "u2",
    trustScore: 80,
  });

  assert.equal(policy.canSend, true);
  assert.equal(policy.reason, "ALLOWED");
  assert.equal(policy.remainingNonFriendMessages, nonFriendDirectMessageLimit);
});

test("direct message policy waits for a reply after one non-mutual message", () => {
  assert.equal(nonFriendDirectMessageLimit, 1);

  const secondBlocked = resolveDirectMessageSendPolicy({
    conversationId: "c1",
    currentUserMessageCount: 1,
    currentUserProfileId: "u1",
    peerProfileId: "u2",
    trustScore: 80,
  });

  assert.equal(secondBlocked.canSend, false);
  assert.equal(secondBlocked.reason, "NON_FRIEND_LIMIT_REACHED");
  assert.equal(secondBlocked.remainingNonFriendMessages, 0);

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

test("a NOW match unlocks a private conversation while retaining the trust gate", () => {
  const matched = resolveDirectMessageSendPolicy({
    currentUserProfileId: "host",
    peerProfileId: "interested",
    currentUserMessageCount: 4,
    hasNowMatch: true,
    trustScore: 80,
  });
  assert.equal(matched.canSend, true);
  assert.equal(matched.remainingNonFriendMessages, null);
  assert.equal(
    resolveDirectMessageSendPolicy({
      currentUserProfileId: "host",
      peerProfileId: "interested",
      hasNowMatch: true,
      trustScore: 59,
    }).reason,
    "LOW_TRUST",
  );
});
