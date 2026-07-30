import assert from "node:assert/strict";
import test from "node:test";
import {
  getFollowRelationshipBucketsFromEdges,
  getFollowRelationshipStateFromFlags,
} from "./followRelations";

test("follow relationship state resolves one-way and mutual relations", () => {
  assert.deepEqual(
    getFollowRelationshipStateFromFlags({
      viewerFollowsTarget: false,
      targetFollowsViewer: false,
    }),
    {
      kind: "none",
      isSelf: false,
      viewerFollowsTarget: false,
      targetFollowsViewer: false,
      isMutualFollow: false,
    },
  );
  assert.equal(
    getFollowRelationshipStateFromFlags({
      viewerFollowsTarget: true,
      targetFollowsViewer: false,
    }).kind,
    "following",
  );
  assert.equal(
    getFollowRelationshipStateFromFlags({
      viewerFollowsTarget: false,
      targetFollowsViewer: true,
    }).kind,
    "followed_by",
  );
  assert.deepEqual(
    getFollowRelationshipStateFromFlags({
      viewerFollowsTarget: true,
      targetFollowsViewer: true,
    }),
    {
      kind: "mutual",
      isSelf: false,
      viewerFollowsTarget: true,
      targetFollowsViewer: true,
      isMutualFollow: true,
    },
  );
});

test("follow relationship state treats self as a dedicated relation", () => {
  const state = getFollowRelationshipStateFromFlags({
    isSelf: true,
    viewerFollowsTarget: true,
    targetFollowsViewer: true,
  });

  assert.equal(state.kind, "self");
  assert.equal(state.isSelf, true);
  assert.equal(state.isMutualFollow, false);
});

test("follow relationship buckets split following, followers, and mutual follows", () => {
  assert.deepEqual(
    getFollowRelationshipBucketsFromEdges("me", [
      {
        followerId: "me",
        followingId: "alice",
      },
      {
        followerId: "bob",
        followingId: "me",
      },
      {
        followerId: "me",
        followingId: "chloe",
      },
      {
        followerId: "chloe",
        followingId: "me",
      },
      {
        followerId: "me",
        followingId: "me",
      },
    ]),
    {
      followingOnlyIds: ["alice"],
      followerOnlyIds: ["bob"],
      mutualFollowIds: ["chloe"],
    },
  );
});
