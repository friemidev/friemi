export const DESKTOP_LOBBY_CANDIDATE_CONTEXT = "LOBBY_CANDIDATE";
export const DESKTOP_LOBBY_CANDIDATE_ORIGIN = "lobby-candidate";
export const DESKTOP_LOBBY_CANDIDATE_MIN_LEAD_HOURS = 2;
export const DESKTOP_LOBBY_CANDIDATE_WINDOW_DAYS = 14;

export type OrderedPageSlice = {
  skip: number;
  take: number;
};

export function getDesktopLobbyCandidateWindow(reference = new Date()) {
  return {
    from: new Date(
      reference.getTime() +
        DESKTOP_LOBBY_CANDIDATE_MIN_LEAD_HOURS * 60 * 60 * 1000,
    ),
    to: new Date(
      reference.getTime() +
        DESKTOP_LOBBY_CANDIDATE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    ),
  };
}

export function getOrderedPageSlices(
  bucketCounts: number[],
  offset: number,
  pageSize: number,
): OrderedPageSlice[] {
  const pageStart = Math.max(0, Math.floor(offset));
  const pageEnd = pageStart + Math.max(0, Math.floor(pageSize));
  let bucketStart = 0;

  return bucketCounts.map((rawCount) => {
    const count = Math.max(0, Math.floor(rawCount));
    const bucketEnd = bucketStart + count;
    const overlapStart = Math.max(pageStart, bucketStart);
    const overlapEnd = Math.min(pageEnd, bucketEnd);
    const take = Math.max(0, overlapEnd - overlapStart);
    const slice = {
      skip: take > 0 ? overlapStart - bucketStart : 0,
      take,
    };

    bucketStart = bucketEnd;

    return slice;
  });
}

export function buildDesktopLobbyCandidateSourceUrl(publicEventId: string) {
  return `friemi://lobby-candidate/${encodeURIComponent(publicEventId)}`;
}
