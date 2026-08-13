import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPlanetChatListReturnHref,
  filterUnifiedChatRosterEntries,
  getPlanetChatListScrollStorageKey,
  getPlanetChatListState,
  type UnifiedChatRosterFilterEntry,
} from "./planetChatListState";

type TestEntry = UnifiedChatRosterFilterEntry & { id: string };

const entries: TestEntry[] = [
  {
    hasContent: true,
    id: "direct-mutual",
    isFollowing: true,
    isMutual: true,
    isOfficial: false,
    isPinned: false,
    kind: "direct",
    searchText: "Alice hello",
  },
  {
    hasContent: false,
    id: "direct-official",
    isFollowing: false,
    isMutual: false,
    isOfficial: true,
    isPinned: false,
    kind: "direct",
    searchText: "Friemi official",
  },
  {
    hasContent: true,
    id: "room",
    isFollowing: false,
    isMutual: false,
    isOfficial: false,
    isPinned: false,
    kind: "room",
    searchText: "Weekend meetup",
  },
  {
    hasContent: false,
    id: "planet-empty",
    isFollowing: false,
    isMutual: false,
    isOfficial: false,
    isPinned: false,
    kind: "planet",
    searchText: "Quiet orbit photography",
  },
  {
    hasContent: false,
    id: "planet-pinned",
    isFollowing: false,
    isMutual: false,
    isOfficial: false,
    isPinned: true,
    kind: "planet",
    searchText: "Board game strategy last sender",
  },
];

test("planet chat list state parses supported filters and search", () => {
  assert.deepEqual(
    getPlanetChatListState(
      "?tab=message&chatFilter=rooms&chatQuery=board%20game",
    ),
    { filter: "rooms", query: "board game" },
  );
});

test("planet chat list state rejects unsupported URL filters", () => {
  assert.deepEqual(getPlanetChatListState("?chatFilter=unknown"), {
    filter: "all",
    query: "",
  });
});

test("planet chat list state builds a minimal localized return URL", () => {
  assert.equal(
    buildPlanetChatListReturnHref({
      filter: "all",
      locale: "zh-CN",
      query: "",
    }),
    "/zh-CN/footprints?tab=message",
  );

  assert.equal(
    buildPlanetChatListReturnHref({
      filter: "rooms",
      locale: "en",
      query: " planet art ",
    }),
    "/en/footprints?tab=message&chatFilter=rooms&chatQuery=planet+art",
  );
});

test("planet chat scroll state is isolated by complete return URL", () => {
  assert.equal(
    getPlanetChatListScrollStorageKey(
      "/fr/footprints?tab=message&chatFilter=rooms",
    ),
    "friemi:planet-chat-list-scroll:/fr/footprints?tab=message&chatFilter=rooms",
  );
});

test("unified chat all filter keeps conversations with content or pinning", () => {
  assert.deepEqual(
    filterUnifiedChatRosterEntries(entries, "all", "").map((entry) => entry.id),
    ["direct-mutual", "room", "planet-pinned"],
  );
});

test("unified chat room filter includes activity and planet rooms", () => {
  assert.deepEqual(
    filterUnifiedChatRosterEntries(entries, "rooms", "").map(
      (entry) => entry.id,
    ),
    ["room", "planet-empty", "planet-pinned"],
  );
});

test("unified chat search matches planet name tags messages and sender text", () => {
  assert.deepEqual(
    filterUnifiedChatRosterEntries(entries, "rooms", "strategy").map(
      (entry) => entry.id,
    ),
    ["planet-pinned"],
  );
  assert.deepEqual(
    filterUnifiedChatRosterEntries(entries, "rooms", "photography").map(
      (entry) => entry.id,
    ),
    ["planet-empty"],
  );
});

test("unified chat relationship filters stay limited to direct chats", () => {
  assert.deepEqual(
    filterUnifiedChatRosterEntries(entries, "mutual", "").map(
      (entry) => entry.id,
    ),
    ["direct-mutual"],
  );
  assert.deepEqual(
    filterUnifiedChatRosterEntries(entries, "official", "").map(
      (entry) => entry.id,
    ),
    ["direct-official"],
  );
});
