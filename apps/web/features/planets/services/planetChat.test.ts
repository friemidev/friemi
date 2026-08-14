import assert from "node:assert/strict";
import test from "node:test";
import {
  canMentionEveryoneInPlanet,
  getLocalizedPlanetChatName,
  getPlanetChatUnreadSince,
  isApprovedPlanetChatMember,
  normalizePlanetChatMessage,
  normalizePlanetChatPayload,
  PlanetChatDomainError,
  resolvePlanetChatPreferenceTimestamp,
  sortPlanetChatRosterItems,
  type PlanetChatRosterItemViewModel,
} from "./planetChat";

test("planet chat access only accepts approved memberships", () => {
  assert.equal(isApprovedPlanetChatMember("APPROVED"), true);
  assert.equal(isApprovedPlanetChatMember("PENDING"), false);
  assert.equal(isApprovedPlanetChatMember(null), false);
});

test("planet chat messages are trimmed and bounded", () => {
  assert.equal(normalizePlanetChatMessage("  hello  "), "hello");
  assert.throws(
    () => normalizePlanetChatMessage("   "),
    (error) =>
      error instanceof PlanetChatDomainError &&
      error.code === "INVALID_MESSAGE",
  );
  assert.throws(
    () => normalizePlanetChatMessage("x".repeat(1001)),
    (error) =>
      error instanceof PlanetChatDomainError &&
      error.code === "INVALID_MESSAGE",
  );
});

test("planet chat payloads accept emoji and image-only messages", () => {
  assert.deepEqual(normalizePlanetChatPayload("  🎉  "), {
    content: "🎉",
    imageUrls: [],
  });
  assert.deepEqual(
    normalizePlanetChatPayload("", ["https://cdn.example/image.webp"]),
    {
      content: "",
      imageUrls: ["https://cdn.example/image.webp"],
    },
  );
  assert.throws(
    () => normalizePlanetChatPayload("", ["javascript:alert(1)"]),
    (error) =>
      error instanceof PlanetChatDomainError &&
      error.code === "INVALID_MESSAGE",
  );
});

test("planet chat roster uses translations with a stable fallback", () => {
  assert.equal(
    getLocalizedPlanetChatName({
      fallbackName: "默认星球",
      locale: "fr",
      translations: { en: "English planet", fr: "Planete francaise" },
    }),
    "Planete francaise",
  );
  assert.equal(
    getLocalizedPlanetChatName({
      fallbackName: "默认星球",
      locale: "zh-CN",
      translations: { en: "English planet" },
    }),
    "默认星球",
  );
});

test("planet chat unread time never predates membership", () => {
  const joinedAt = new Date("2026-08-10T10:00:00.000Z");
  const staleReadAt = new Date("2026-08-01T10:00:00.000Z");
  const recentReadAt = new Date("2026-08-12T10:00:00.000Z");

  assert.equal(
    getPlanetChatUnreadSince(joinedAt).toISOString(),
    joinedAt.toISOString(),
  );
  assert.equal(
    getPlanetChatUnreadSince(joinedAt, staleReadAt).toISOString(),
    joinedAt.toISOString(),
  );
  assert.equal(
    getPlanetChatUnreadSince(joinedAt, recentReadAt).toISOString(),
    recentReadAt.toISOString(),
  );
});

test("planet chat mute and pin preferences use nullable timestamps", () => {
  const now = new Date("2026-08-13T12:00:00.000Z");

  assert.equal(resolvePlanetChatPreferenceTimestamp(true, now), now);
  assert.equal(resolvePlanetChatPreferenceTimestamp(false, now), null);
});

test("planet chat roster sorts pinned items first and then by latest activity", () => {
  function item({
    id,
    isPinned = false,
    joinedAt,
    lastMessageAt,
  }: {
    id: string;
    isPinned?: boolean;
    joinedAt: string;
    lastMessageAt?: string;
  }): PlanetChatRosterItemViewModel {
    return {
      coverImageUrl: null,
      id,
      isMuted: false,
      isPinned,
      joinedAt,
      lastMessage: lastMessageAt
        ? {
            body: id,
            createdAt: lastMessageAt,
            id: `message:${id}`,
            isMine: false,
            senderId: `sender:${id}`,
            senderName: id,
          }
        : null,
      name: id,
      slug: id,
      tags: [],
      unreadMention: null,
      unreadCount: 0,
    };
  }

  const sorted = sortPlanetChatRosterItems([
    item({ id: "older", joinedAt: "2026-08-01T00:00:00.000Z" }),
    item({
      id: "latest",
      joinedAt: "2026-08-01T00:00:00.000Z",
      lastMessageAt: "2026-08-12T00:00:00.000Z",
    }),
    item({
      id: "pinned",
      isPinned: true,
      joinedAt: "2026-07-01T00:00:00.000Z",
    }),
  ]);

  assert.deepEqual(
    sorted.map((entry) => entry.id),
    ["pinned", "latest", "older"],
  );
});

test("planet mention-all permission is limited to owners and admins", () => {
  assert.equal(canMentionEveryoneInPlanet("OWNER"), true);
  assert.equal(canMentionEveryoneInPlanet("ADMIN"), true);
  assert.equal(canMentionEveryoneInPlanet("MEMBER"), false);
});
