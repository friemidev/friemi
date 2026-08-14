import { withLocale } from "@/lib/routes";

export type PlanetChatListFilter =
  | "all"
  | "following"
  | "mutual"
  | "official"
  | "rooms";

export type UnifiedChatRosterFilterEntry = {
  hasContent: boolean;
  isFollowing: boolean;
  isMutual: boolean;
  isOfficial: boolean;
  isPinned: boolean;
  kind: "direct" | "official" | "room" | "planet";
  searchText: string;
};

const FILTER_PARAM = "chatFilter";
const QUERY_PARAM = "chatQuery";
const SCROLL_STORAGE_PREFIX = "friemi:planet-chat-list-scroll:";

export function getPlanetChatListState(search: string): {
  filter: PlanetChatListFilter;
  query: string;
} {
  const params = new URLSearchParams(search);
  const candidate = params.get(FILTER_PARAM);
  const filter: PlanetChatListFilter =
    candidate === "following" ||
    candidate === "mutual" ||
    candidate === "official" ||
    candidate === "rooms"
      ? candidate
      : "all";

  return {
    filter,
    query: params.get(QUERY_PARAM)?.trim() ?? "",
  };
}

export function buildPlanetChatListReturnHref({
  filter,
  locale,
  query,
}: {
  filter: PlanetChatListFilter;
  locale: string;
  query: string;
}) {
  const params = new URLSearchParams({ tab: "message" });
  const normalizedQuery = query.trim();

  if (filter !== "all") {
    params.set(FILTER_PARAM, filter);
  }

  if (normalizedQuery) {
    params.set(QUERY_PARAM, normalizedQuery);
  }

  return withLocale(locale, `/footprints?${params.toString()}`);
}

export function getPlanetChatListScrollStorageKey(returnHref: string) {
  return `${SCROLL_STORAGE_PREFIX}${returnHref}`;
}

export function filterUnifiedChatRosterEntries<
  Entry extends UnifiedChatRosterFilterEntry,
>(entries: Entry[], filter: PlanetChatListFilter, query: string): Entry[] {
  const filteredEntries = entries.filter((entry) => {
    if (filter === "following") {
      return entry.kind === "direct" && entry.isFollowing;
    }

    if (filter === "official") {
      return entry.kind === "official" && entry.isOfficial;
    }

    if (filter === "mutual") {
      return entry.kind === "direct" && entry.isMutual;
    }

    if (filter === "rooms") {
      return entry.kind === "room" || entry.kind === "planet";
    }

    return entry.hasContent || entry.isPinned;
  });
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return filteredEntries;
  }

  return filteredEntries.filter((entry) =>
    entry.searchText.toLocaleLowerCase().includes(normalizedQuery),
  );
}
